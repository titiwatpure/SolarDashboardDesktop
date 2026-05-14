const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole, JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// Token expiry configuration
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30', 10);

// ---------------------------------------------------------------------------
// Helpers — refresh token CRUD
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random refresh token.
 * @returns {string} 64-char hex string
 */
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store a refresh token in the database.
 * @param {string} userId
 * @param {string} token
 * @returns {{ id: string, token: string, expiresAt: string }}
 */
async function storeRefreshToken(userId, token) {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, token, expiresAt]
  );

  return { id, token, expiresAt };
}

/**
 * Find a valid (non-expired) refresh token in the database.
 * @param {string} token
 * @returns {object|null} row or null
 */
async function findRefreshToken(token) {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")',
    [token]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a specific refresh token (used during rotation / logout).
 * @param {string} token
 */
async function deleteRefreshToken(token) {
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
}

/**
 * Delete all refresh tokens for a user (logout-all / security invalidation).
 * @param {string} userId
 */
async function deleteAllUserRefreshTokens(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
}

/**
 * Clean up expired refresh tokens (housekeeping).
 * Call periodically or before operations.
 */
async function cleanupExpiredTokens() {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at <= datetime("now")');
  } catch (err) {
    console.error('Refresh token cleanup error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login — เข้าสู่ระบบ
// ---------------------------------------------------------------------------

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username และ password จำเป็น' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (result.rows.length === 0) {
      const ipAddress = req.ip || req.socket?.remoteAddress;
      logActivity(null, 'login_failed', 'user', null, { username, reason: 'user_not_found' }, ipAddress, 'warning');
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];

    if (user.status && user.status !== 'active') {
      const ipAddress = req.ip || req.socket?.remoteAddress;
      logActivity(user.id, 'login_failed', 'user', user.id, { username, reason: 'account_disabled' }, ipAddress, 'warning');
      return res.status(403).json({ error: 'บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const ipAddress = req.ip || req.socket?.remoteAddress;
      logActivity(user.id, 'login_failed', 'user', user.id, { username, reason: 'invalid_password' }, ipAddress, 'warning');
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Generate short-lived access token (JWT)
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate long-lived refresh token (opaque random string)
    const refreshTokenValue = generateRefreshToken();
    await storeRefreshToken(user.id, refreshTokenValue);

    const ipAddress = req.ip || req.socket?.remoteAddress;
    logActivity(user.id, 'login', 'user', user.id, { username: user.username }, ipAddress);

    // Run cleanup in background — don't block the response
    cleanupExpiredTokens();

    res.json({
      // accessToken: new name (clients should migrate to this)
      accessToken,
      refreshToken: refreshTokenValue,
      // token: backward-compatible alias — same value as accessToken
      token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — รับ refreshToken แล้วออก accessToken ใหม่
// ---------------------------------------------------------------------------

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token จำเป็น' });
    }

    // 1. Look up the refresh token in the database
    const storedToken = await findRefreshToken(refreshToken);

    if (!storedToken) {
      return res.status(401).json({ error: 'Refresh token ไม่ถูกต้องหรือหมดอายุ' });
    }

    // 2. Fetch the user associated with this token
    const result = await pool.query('SELECT * FROM users WHERE id = ?', [storedToken.user_id]);

    if (result.rows.length === 0) {
      // User was deleted — clean up token and reject
      await deleteRefreshToken(refreshToken);
      return res.status(401).json({ error: 'ผู้ใช้ไม่พบ' });
    }

    const user = result.rows[0];

    // 3. Token rotation — invalidate the old refresh token BEFORE issuing new ones
    await deleteRefreshToken(refreshToken);

    // 4. Issue new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // 5. Issue new refresh token (rotation)
    const newRefreshTokenValue = generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshTokenValue);

    // Run cleanup in background
    cleanupExpiredTokens();

    res.json({
      accessToken,
      refreshToken: newRefreshTokenValue,
      // token: backward-compatible alias
      token: accessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — ยกเลิก refresh token
// ---------------------------------------------------------------------------

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token จำเป็น' });
    }

    await deleteRefreshToken(refreshToken);

    res.json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout-all — ยกเลิก refresh token ทั้งหมดของผู้ใช้
// ---------------------------------------------------------------------------

router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    await deleteAllUserRefreshTokens(req.user.id);

    const ipAddress = req.ip || req.socket?.remoteAddress;
    logActivity(req.user.id, 'logout_all', 'user', req.user.id, {}, ipAddress);

    res.json({ message: 'ยกเลิก token ทั้งหมดสำเร็จ' });
  } catch (error) {
    console.error('Logout-all error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/sessions — รายการ refresh tokens ที่ active อยู่
// ---------------------------------------------------------------------------

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, created_at, expires_at FROM refresh_tokens
       WHERE user_id = ? AND expires_at > datetime("now")
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/register — สร้างผู้ใช้ใหม่ (เฉพาะ Admin)
// ---------------------------------------------------------------------------

router.post(
  '/register',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const { username, email, password, full_name, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
      }

      const validRoles = ['admin', 'engineer', 'staff', 'client'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
      }

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'ชื่อผู้ใช้หรือ email มีอยู่แล้ว' });
      }

      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 12);

      await pool.query(
        'INSERT INTO users (id, username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [id, username, email, hashedPassword, full_name || null, role || 'engineer']
      );

      const ipAddress = req.ip || req.socket?.remoteAddress;
      logActivity(req.user.id, 'create', 'user', id, { username, role: role || 'engineer' }, ipAddress);

      res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ', userId: id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
    }
  }
);

module.exports = router;
