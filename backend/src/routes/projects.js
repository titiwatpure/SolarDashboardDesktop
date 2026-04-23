const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all projects with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { province, status, current_step, page = 1, limit = 10 } = req.query;
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (province) {
      query += ` AND province = $${paramCount++}`;
      params.push(province);
    }
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    if (current_step) {
      query += ` AND current_step = $${paramCount++}`;
      params.push(current_step);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM projects WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (province) {
      countQuery += ` AND province = $${countParamCount++}`;
      countParams.push(province);
    }
    if (status) {
      countQuery += ` AND status = $${countParamCount++}`;
      countParams.push(status);
    }
    if (current_step) {
      countQuery += ` AND current_step = $${countParamCount++}`;
      countParams.push(current_step);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Create project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      project_name,
      project_code,
      size_kw,
      size_kva,
      province,
      responsible_user,
      description,
      has_power_selling,
      start_date
    } = req.body;

    const id = uuidv4();

    // Determine permit type based on size and power selling
    let requires_permit = false;
    let permit_type = null;

    if (has_power_selling || (size_kva && size_kva > 1000)) {
      requires_permit = true;
      permit_type = 'permit';
    } else if (size_kva && size_kva <= 1000 && !has_power_selling) {
      requires_permit = true;
      permit_type = 'exemption';
    }

    const result = await pool.query(
      `INSERT INTO projects (
        id, project_name, project_code, size_kw, size_kva, province, 
        responsible_user, description, has_power_selling, requires_permit, 
        permit_type, start_date, status, current_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id, project_name, project_code, size_kw, size_kva, province,
        responsible_user, description, has_power_selling, requires_permit,
        permit_type, start_date, 'pending', 'survey'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = [
      'project_name', 'province', 'status', 'current_step',
      'responsible_user', 'description', 'has_power_selling',
      'blocked_reason', 'actual_cod_date', 'expected_cod_date'
    ];

    const setFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (setFields.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const query = `UPDATE projects SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    res.json({ message: 'ลบโครงการสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Get project KPIs
router.get('/stats/kpis', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked
      FROM projects
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
