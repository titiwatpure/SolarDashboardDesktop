const express = require('express');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// GET /api/settings/company — ดึงข้อมูลบริษัท
router.get('/company', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM company_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/settings/company — อัปเดตข้อมูลบริษัท (Admin only)
router.put('/company', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const allowedKeys = ['company_name', 'address', 'phone', 'email', 'tax_id', 'logo_url'];
    const updates = req.body;

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        await pool.query(
          `INSERT INTO company_settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, updates[key] || null, new Date().toISOString()]
        );
      }
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    logActivity(req.user.id, 'update', 'settings', null, { action: 'update_company_settings' }, ipAddress);

    // Return updated settings
    const result = await pool.query('SELECT key, value FROM company_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
