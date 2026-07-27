/**
 * Report Drafts API
 * จัดการรายงานที่ผู้ใช้กรอกเอง
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/report-drafts — ดึงรายการรายงานทั้งหมด
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rd.*, u.full_name as created_by_name
      FROM report_drafts rd
      LEFT JOIN users u ON rd.created_by = u.id
      ORDER BY rd.report_date DESC, rd.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[REPORT_DRAFTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/report-drafts/:id — ดึงรายงานเดียว
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rd.*, u.full_name as created_by_name
      FROM report_drafts rd
      LEFT JOIN users u ON rd.created_by = u.id
      WHERE rd.id = ?
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายงาน' });
    }

    const draft = result.rows[0];
    // Parse action_items JSON
    if (draft.action_items) {
      try {
        draft.action_items = JSON.parse(draft.action_items);
      } catch {
        draft.action_items = [];
      }
    }

    if (draft.custom_sections) {
      try {
        draft.custom_sections = JSON.parse(draft.custom_sections);
      } catch {
        draft.custom_sections = [];
      }
    }

    if (draft.comments) {
      try {
        draft.comments = JSON.parse(draft.comments);
      } catch {
        draft.comments = [];
      }
    }

    res.json(draft);
  } catch (error) {
    console.error('[REPORT_DRAFTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/report-drafts — สร้างรายงานใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, report_date, version, summary, analysis,
      recommendations, notes, prepared_by, approved_by,
      reviewed_by, action_items, custom_sections, comments
    } = req.body;

    const id = uuidv4();
    await pool.query(`
      INSERT INTO report_drafts (
        id, title, report_date, version, summary, analysis,
        recommendations, notes, prepared_by, approved_by,
        reviewed_by, action_items, custom_sections, comments, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      title || 'รายงานผู้บริหาร',
      report_date || new Date().toISOString().slice(0, 10),
      version || '1.0',
      summary || '',
      analysis || '',
      recommendations || '',
      notes || '',
      prepared_by || '',
      approved_by || '',
      reviewed_by || '',
      JSON.stringify(action_items || []),
      JSON.stringify(custom_sections || []),
      JSON.stringify(comments || []),
      req.user.id
    ]);

    const result = await pool.query('SELECT * FROM report_drafts WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[REPORT_DRAFTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/report-drafts/:id — อัปเดตรายงาน
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title, report_date, version, status, summary, analysis,
      recommendations, notes, prepared_by, approved_by,
      reviewed_by, action_items, custom_sections, comments
    } = req.body;

    const setClauses = [];
    const values = [];

    if (title !== undefined) { setClauses.push('title = ?'); values.push(title); }
    if (report_date !== undefined) { setClauses.push('report_date = ?'); values.push(report_date); }
    if (version !== undefined) { setClauses.push('version = ?'); values.push(version); }
    if (status !== undefined) { setClauses.push('status = ?'); values.push(status); }
    if (summary !== undefined) { setClauses.push('summary = ?'); values.push(summary); }
    if (analysis !== undefined) { setClauses.push('analysis = ?'); values.push(analysis); }
    if (recommendations !== undefined) { setClauses.push('recommendations = ?'); values.push(recommendations); }
    if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes); }
    if (prepared_by !== undefined) { setClauses.push('prepared_by = ?'); values.push(prepared_by); }
    if (approved_by !== undefined) { setClauses.push('approved_by = ?'); values.push(approved_by); }
    if (reviewed_by !== undefined) { setClauses.push('reviewed_by = ?'); values.push(reviewed_by); }
    if (action_items !== undefined) { setClauses.push('action_items = ?'); values.push(JSON.stringify(action_items)); }
    if (custom_sections !== undefined) { setClauses.push('custom_sections = ?'); values.push(JSON.stringify(custom_sections)); }
    if (comments !== undefined) { setClauses.push('comments = ?'); values.push(JSON.stringify(comments)); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = datetime("now")');
    values.push(req.params.id);

    await pool.query(
      `UPDATE report_drafts SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const result = await pool.query('SELECT * FROM report_drafts WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[REPORT_DRAFTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/report-drafts/:id — ลบรายงาน
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM report_drafts WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'ไม่พบรายงาน' });
    }
    res.json({ message: 'ลบรายงานแล้ว' });
  } catch (error) {
    console.error('[REPORT_DRAFTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
