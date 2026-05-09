const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: สร้าง notification ใหม่
const createNotification = async (userId, type, title, message, entityType, entityId) => {
  try {
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, type, title, message || null, entityType || null, entityId || null]
    );
  } catch (err) {
    console.error('Notification error:', err);
  }
};

// GET /api/notifications — ดึง notifications ของ user ปัจจุบัน (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      [req.user.id]
    );
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

// GET /api/notifications/unread-count — นับ unread
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0]?.count || '0', 10) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน' });
    }
    res.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ message: 'อัปเดตทั้งหมดสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/notifications/:id — ลบ notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน' });
    }
    res.json({ message: 'ลบการแจ้งเตือนสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
module.exports.createNotification = createNotification;
