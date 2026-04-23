const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get project summary by status
router.get('/summary/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM projects) as percentage
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

// Get project summary by size
router.get('/summary/size', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN size_kw <= 1000 THEN 'ขนาดเล็ก (≤ 1MW)'
          WHEN size_kw > 1000 THEN 'ขนาดใหญ่ (> 1MW)'
        END as size_category,
        COUNT(*) as count,
        ROUND(AVG(size_kw), 2) as avg_size,
        SUM(size_kw) as total_capacity
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

// Get project summary by province
router.get('/summary/province', authenticateToken, async (req, res) => {
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

// Get project summary by step
router.get('/summary/step', authenticateToken, async (req, res) => {
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

module.exports = router;
