/**
 * Document Agency Submissions API
 * การยื่นหน่วยงาน
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/projects/:projectId/submit
// ============================================================
router.post('/projects/:projectId/submit', authenticateToken, async (req, res) => {
  try {
    const { agency_name, submitted_date, notes } = req.body;

    if (!agency_name || !submitted_date) {
      return res.status(400).json({ error: 'กรุณาระบุหน่วยงานและวันที่ยื่น' });
    }

    const projectCheck = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    // Business Rule: ยังไม่ internal approved → ห้ามยื่นหน่วยงาน
    const project = projectCheck.rows[0];
    if (!['ready_to_submit', 'agency_revision', 'submitted_agency'].includes(project.project_status)) {
      return res.status(400).json({ error: 'โครงการยังไม่ได้รับการอนุมัติภายใน หรืออยู่ในสถานะที่ไม่สามารถยื่นหน่วยงานได้' });
    }

    const result = await pool.transaction(async (tx) => {
      // Get next round number
      const roundResult = await tx.query(
        'SELECT COALESCE(MAX(submission_round), 0) + 1 as next_round FROM doc_agency_submissions WHERE project_id = ?',
        [req.params.projectId]
      );
      const nextRound = roundResult.rows[0].next_round;

      const id = uuidv4();
      await tx.query(
        `INSERT INTO doc_agency_submissions (id, project_id, agency_name, submission_round, submitted_date, agency_status, next_action)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [id, req.params.projectId, agency_name, nextRound, submitted_date, notes || null]
      );

      // Update project status
      await tx.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        ['submitted_agency', req.params.projectId]
      );

      const row = await tx.query('SELECT * FROM doc_agency_submissions WHERE id = ?', [id]);
      return { submission: row.rows[0], nextRound };
    });

    logActivity(req.user.id, 'submit', 'doc_agency_submission', result.submission.id, {
      agency_name,
      submission_round: result.nextRound,
      submitted_date
    });

    res.status(201).json(result.submission);
  } catch (error) {
    console.error('[DOC_REVIEW_SUBMISSIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/submissions/:id
// ============================================================
router.put('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { agency_status, agency_comment, response_date, next_action } = req.body;

    const existing = await pool.query('SELECT * FROM doc_agency_submissions WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการยื่น' });
    }

    const submission = existing.rows[0];

    await pool.transaction(async (tx) => {
      const setClauses = [];
      const values = [];

      if (agency_status !== undefined) { setClauses.push('agency_status = ?'); values.push(agency_status); }
      if (agency_comment !== undefined) { setClauses.push('agency_comment = ?'); values.push(agency_comment); }
      if (response_date !== undefined) { setClauses.push('response_date = ?'); values.push(response_date); }
      if (next_action !== undefined) { setClauses.push('next_action = ?'); values.push(next_action); }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
      }

      values.push(req.params.id);

      await tx.query(
        `UPDATE doc_agency_submissions SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );

      // Update project status based on agency response
      if (agency_status) {
        let newProjectStatus = 'submitted_agency';

        if (agency_status === 'approved') {
          newProjectStatus = 'approved';
        } else if (agency_status === 'revision_requested') {
          newProjectStatus = 'agency_revision';
        }

        await tx.query(
          'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
          [newProjectStatus, submission.project_id]
        );
      }
    });

    logActivity(req.user.id, 'update', 'doc_agency_submission', req.params.id, { agency_status });

    const result = await pool.query('SELECT * FROM doc_agency_submissions WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_SUBMISSIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/submissions - ดึง submissions ทั้งหมด (สำหรับ Agency Tracking)
// ============================================================
router.get('/submissions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, p.project_code, p.project_name, pk.package_name
       FROM doc_agency_submissions s
       LEFT JOIN doc_review_projects p ON s.project_id = p.id
       LEFT JOIN doc_submission_packages pk ON s.project_id = pk.project_id AND s.agency_name = pk.agency
       ORDER BY s.submitted_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_SUBMISSIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/projects/:projectId/submissions
// ============================================================
router.get('/projects/:projectId/submissions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM doc_agency_submissions WHERE project_id = ? ORDER BY submission_round DESC`,
      [req.params.projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_SUBMISSIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
