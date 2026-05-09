const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizePermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { createNotification } = require('./notifications');
const { calculateRisk } = require('../services/riskDetection');

const router = express.Router();

// GET /api/projects/:projectId/checkpoints — list checkpoints for project
router.get('/projects/:projectId/checkpoints', authenticateToken, async (req, res) => {
  try {
    const { step } = req.query;
    let query = 'SELECT c.*, u.full_name as assigned_to_name FROM checkpoints c LEFT JOIN users u ON c.assigned_to = u.id WHERE c.project_id = ?';
    const params = [req.params.projectId];

    if (step) {
      query += ' AND c.step = ?';
      params.push(step);
    }

    query += ' ORDER BY c.step, c.created_at';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects/:projectId/checkpoints — create checkpoint
router.post('/projects/:projectId/checkpoints', authenticateToken, authorizePermission('checkpoint.approve'), async (req, res) => {
  try {
    const { step, checkpoint_name, required, assigned_to, notes } = req.body;
    if (!step || !checkpoint_name) {
      return res.status(400).json({ error: 'กรุณาระบุ step และ checkpoint_name' });
    }

    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'ไม่พบโครงการ' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO checkpoints (id, project_id, step, checkpoint_name, status, required, assigned_to, notes)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, req.params.projectId, step, checkpoint_name, required !== 0 ? 1 : 0, assigned_to || null, notes || null]
    );

    // Log checkpoint creation
    await pool.query(
      `INSERT INTO checkpoint_logs (id, checkpoint_id, action, new_status, reason, performed_by)
       VALUES (?, ?, 'created', 'pending', ?, ?)`,
      [uuidv4(), id, notes || 'สร้างจุดตรวจสอบใหม่', req.user.id]
    );

    logActivity(req.user.id, 'create', 'checkpoint', id, { step, checkpoint_name });

    const result = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/checkpoints/:id — update checkpoint
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes, assigned_to } = req.body;
    const existing = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบจุดตรวจสอบ' });

    const checkpoint = existing.rows[0];
    const prevStatus = checkpoint.status;

    const setClauses = [];
    const values = [];

    if (status && status !== prevStatus) {
      if (!['pending', 'passed', 'failed', 'skipped'].includes(status)) {
        return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
      }
      setClauses.push('status = ?');
      values.push(status);
      if (status === 'passed' || status === 'failed' || status === 'skipped') {
        setClauses.push('completed_at = ?');
        values.push(new Date().toISOString());
      } else if (status === 'pending') {
        setClauses.push('completed_at = ?');
        values.push(null);
      }
    }

    if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes); }
    if (assigned_to !== undefined) { setClauses.push('assigned_to = ?'); values.push(assigned_to); }

    if (setClauses.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    await pool.query(`UPDATE checkpoints SET ${setClauses.join(', ')} WHERE id = ?`, values);

    // Log the change
    if (status && status !== prevStatus) {
      await pool.query(
        `INSERT INTO checkpoint_logs (id, checkpoint_id, action, previous_status, new_status, reason, performed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), req.params.id, 'updated', prevStatus, status, notes || null, req.user.id]
      );

      // Notify assigned user if checkpoint failed
      if (status === 'failed' && checkpoint.assigned_to && checkpoint.assigned_to !== req.user.id) {
        createNotification(
          checkpoint.assigned_to, 'checkpoint_failed', 'จุดตรวจสอบไม่ผ่าน',
          `จุดตรวจสอบ "${checkpoint.checkpoint_name}" ไม่ผ่าน`,
          'checkpoint', req.params.id
        );
      }

      // Recalculate risk for the project
      await calculateRisk(checkpoint.project_id);
    }

    logActivity(req.user.id, 'update', 'checkpoint', req.params.id, { status, notes });

    const result = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/checkpoints/:id/approve — approve checkpoint (shortcut for setting status to passed)
router.post('/:id/approve', authenticateToken, authorizePermission('checkpoint.approve'), async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบจุดตรวจสอบ' });

    const checkpoint = existing.rows[0];
    const prevStatus = checkpoint.status;

    await pool.query(
      `UPDATE checkpoints SET status = 'passed', completed_at = ?, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), new Date().toISOString(), req.params.id]
    );

    await pool.query(
      `INSERT INTO checkpoint_logs (id, checkpoint_id, action, previous_status, new_status, reason, performed_by)
       VALUES (?, ?, 'passed', ?, 'passed', ?, ?)`,
      [uuidv4(), req.params.id, prevStatus, reason || 'อนุมัติ', req.user.id]
    );

    logActivity(req.user.id, 'approve', 'checkpoint', req.params.id, { reason });
    await calculateRisk(checkpoint.project_id);

    const result = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/checkpoints/:id/logs — get checkpoint history
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cl.*, u.full_name as performed_by_name
       FROM checkpoint_logs cl
       LEFT JOIN users u ON cl.performed_by = u.id
       WHERE cl.checkpoint_id = ?
       ORDER BY cl.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/checkpoints/:id
router.delete('/:id', authenticateToken, authorizePermission('checkpoint.approve'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบจุดตรวจสอบ' });

    await pool.query('DELETE FROM checkpoints WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'checkpoint', req.params.id, { checkpoint_name: existing.rows[0].checkpoint_name });
    res.json({ message: 'ลบจุดตรวจสอบสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
