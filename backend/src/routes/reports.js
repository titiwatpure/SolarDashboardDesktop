const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/summary/status — สรุปตามสถานะ
router.get('/summary/status', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        CASE WHEN (SELECT COUNT(*) FROM projects) > 0
          THEN ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM projects), 1)
          ELSE 0
        END as percentage
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/size — สรุปตามขนาด
router.get('/summary/size', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN size_kw <= 1000 THEN 'ขนาดเล็ก (≤ 1MW)'
          WHEN size_kw > 1000 THEN 'ขนาดใหญ่ (> 1MW)'
        END as size_category,
        COUNT(*) as count,
        ROUND(AVG(COALESCE(size_kw, 0)), 2) as avg_size,
        ROUND(SUM(COALESCE(size_kw, 0)), 2) as total_capacity
      FROM projects
      GROUP BY size_category
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/province — สรุปตามจังหวัด
router.get('/summary/province', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        province,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 1) as completion_rate
      FROM projects
      GROUP BY province
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/step — สรุปตามขั้นตอน
router.get('/summary/step', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_step as step,
        COUNT(*) as count
      FROM projects
      GROUP BY current_step
      ORDER BY
        CASE current_step
          WHEN 'survey' THEN 1
          WHEN 'design' THEN 2
          WHEN 'erc' THEN 3
          WHEN 'grid' THEN 4
          WHEN 'construction' THEN 5
          WHEN 'testing' THEN 6
          WHEN 'cod' THEN 7
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/step-status — สรุปขั้นตอน + สถานะ (สำหรับ Pipeline)
router.get('/summary/step-status', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_step as step,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM projects
      GROUP BY current_step
      ORDER BY
        CASE current_step
          WHEN 'survey' THEN 1
          WHEN 'design' THEN 2
          WHEN 'erc' THEN 3
          WHEN 'grid' THEN 4
          WHEN 'construction' THEN 5
          WHEN 'testing' THEN 6
          WHEN 'cod' THEN 7
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
