const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Helper: บันทึก activity log
const logActivity = async (userId, action, entityType, entityId, details, ipAddress, severity = 'info') => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress || null, severity]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

// GET /api/activity-logs — ดึง logs ทั้งหมด (Admin only, paginated)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const { user_id, action, entity_type, severity } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user_id) {
      whereClause += ' AND al.user_id = ?';
      params.push(user_id);
    }
    if (action) {
      whereClause += ' AND al.action = ?';
      params.push(action);
    }
    if (entity_type) {
      whereClause += ' AND al.entity_type = ?';
      params.push(entity_type);
    }
    if (severity) {
      whereClause += ' AND al.severity = ?';
      params.push(severity);
    }

    const result = await pool.query(
      `SELECT al.*, u.full_name as user_name, u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM activity_logs al ${whereClause}`,
      params
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

// GET /api/activity-logs/recent — ดึง 20 รายการล่าสุด (Admin only)
router.get('/recent', authenticateToken, authorizeRole(['admin']), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.full_name as user_name, u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/activity-logs — สร้าง log ใหม่ (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { action, entity_type, entity_id, details } = req.body;

    if (!action || !entity_type) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    await logActivity(req.user.id, action, entity_type, entity_id, details, ipAddress);

    res.status(201).json({ message: 'บันทึก activity สำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
module.exports.logActivity = logActivity;
