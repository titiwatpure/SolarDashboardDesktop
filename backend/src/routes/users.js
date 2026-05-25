const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const getUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, username, email, full_name, phone, role, status, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return result.rows[0] || null;
};

// GET /api/users/profile — ดึงโปรไฟล์ตัวเอง (ต้องอยู่ก่อน /:id)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/users — ดึงรายชื่อผู้ใช้ทั้งหมด (Admin only, paginated)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT id, username, email, full_name, phone, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/users/change-password — เปลี่ยนรหัสผ่าน (ต้องอยู่ก่อน /:id)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
    }

    // ดึง password hash จากฐานข้อมูล (getUserById ไม่รวม password)
    const result = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) {
      return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, new Date().toISOString(), req.user.id]
    );

    // Revoke ทุก refresh token เพื่อบังคับ login ใหม่
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);

    logActivity(req.user.id, 'update', 'user', req.user.id, { action: 'change_password' });
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/users/:id — อัปเดตข้อมูลผู้ใช้
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, phone, role, status } = req.body;
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์' });
    }

    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    if (email && email !== existingUser.email) {
      const duplicate = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ error: 'email มีอยู่แล้ว' });
      }
    }

    // role/status: admin เท่านั้นที่แก้ได้
    const newRole = (req.user.role === 'admin' && role) ? role : existingUser.role;
    const newStatus = (req.user.role === 'admin' && status) ? status : existingUser.status;

    const validRoles = ['admin', 'engineer', 'staff', 'client'];
    const validStatuses = ['active', 'inactive'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ error: 'role ไม่ถูกต้อง' });
    }
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'status ไม่ถูกต้อง' });
    }

    await pool.query(
      'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ?, updated_at = ? WHERE id = ?',
      [full_name ?? existingUser.full_name ?? null, email ?? existingUser.email, phone !== undefined ? phone : (existingUser.phone || null), newRole, newStatus, new Date().toISOString(), id]
    );

    const updatedUser = await getUserById(id);
    logActivity(req.user.id, 'update', 'user', id, { full_name, email, role: newRole, status: newStatus });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/users — สร้างผู้ใช้ใหม่ (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
    }

    // #15: Role validation
    const validRoles = ['admin', 'engineer', 'staff', 'client'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }

    const duplicate = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรือ email มีอยู่แล้ว' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (id, username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, email, hashedPassword, full_name || null, role || 'engineer']
    );

    const user = await getUserById(id);
    logActivity(req.user.id, 'create', 'user', id, { username, role: role || 'engineer' });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/users/:id — ลบผู้ใช้ (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existingUser = await getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    // #16: ป้องกัน admin ลบตัวเอง
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
    }

    // #18: จัดการ FK constraint — ล้าง reference ก่อนลบ
    try {
      await pool.query('UPDATE projects SET responsible_user = NULL WHERE responsible_user = ?', [req.params.id]);
      await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?', [req.params.id]);
      await pool.query('UPDATE tasks SET created_by = NULL WHERE created_by = ?', [req.params.id]);
      await pool.query('UPDATE documents SET upload_by = NULL WHERE upload_by = ?', [req.params.id]);
      await pool.query('UPDATE reports SET created_by = NULL WHERE created_by = ?', [req.params.id]);
      await pool.query('UPDATE project_timeline SET changed_by = NULL WHERE changed_by = ?', [req.params.id]);
      await pool.query('UPDATE activity_logs SET user_id = NULL WHERE user_id = ?', [req.params.id]);
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.params.id]);
      await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
      await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    } catch (fkErr) {
      return res.status(400).json({ error: 'ไม่สามารถลบผู้ใช้ได้' });
    }
    logActivity(req.user.id, 'delete', 'user', req.params.id, { username: existingUser.username });
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
