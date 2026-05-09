const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole, JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// POST /api/auth/login — เข้าสู่ระบบ
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
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    const ipAddress = req.ip || req.socket?.remoteAddress;
    logActivity(user.id, 'login', 'user', user.id, { username: user.username }, ipAddress);

    res.json({
      token,
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

// POST /api/auth/register — สร้างผู้ใช้ใหม่ (เฉพาะ Admin)
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

      const validRoles = ['admin', 'engineer'];
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
