const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all organizations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations ORDER BY org_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Get organization with project status
router.get('/:id/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, p.project_name, p.current_step 
       FROM project_organizations po
       JOIN projects p ON po.project_id = p.id
       WHERE po.organization_id = $1
       ORDER BY po.submitted_date DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Create organization (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { org_name, org_type } = req.body;
    const id = uuidv4();

    const result = await pool.query(
      'INSERT INTO organizations (id, org_name, org_type) VALUES ($1, $2, $3) RETURNING *',
      [id, org_name, org_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'ชื่อหน่วยงานมีอยู่แล้ว' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
