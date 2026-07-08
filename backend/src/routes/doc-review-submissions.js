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
    const allowedStatuses = ['ready_to_submit', 'agency_revision', 'submitted_agency'];
    const hasApproval = await pool.query(
      `SELECT id FROM doc_review_approvals WHERE project_id = ? AND approval_status = 'approved' LIMIT 1`,
      [req.params.projectId]
    );
    if (!allowedStatuses.includes(project.project_status) && hasApproval.rows.length === 0) {
      return res.status(400).json({ error: 'โครงการยังไม่ได้รับการอนุมัติภายใน หรืออยู่ในสถานะที่ไม่สามารถยื่นหน่วยงานได้' });
    }

    const { package_id } = req.body;

    const result = await pool.transaction(async (tx) => {
      // นับรอบยื่นเฉพาะของ package นี้ (ถ้ามี) หรือของทั้งโครงการ
      const roundResult = package_id
        ? await tx.query(
            'SELECT COALESCE(MAX(submission_round), 0) + 1 as next_round FROM doc_agency_submissions WHERE package_id = ?',
            [package_id]
          )
        : await tx.query(
            'SELECT COALESCE(MAX(submission_round), 0) + 1 as next_round FROM doc_agency_submissions WHERE project_id = ?',
            [req.params.projectId]
          );
      const nextRound = roundResult.rows[0].next_round;

      const id = uuidv4();
      await tx.query(
        `INSERT INTO doc_agency_submissions (id, project_id, package_id, agency_name, submission_round, submitted_date, agency_status, next_action)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, req.params.projectId, package_id || null, agency_name, nextRound, submitted_date, notes || null]
      );

      // อัป package_status ถ้ามี package_id
      if (package_id) {
        await tx.query(
          'UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?',
          ['submitted_agency', package_id]
        );
      }

      // Sync project_status
      const pkgs = await tx.query('SELECT package_status FROM doc_submission_packages WHERE project_id = ?', [req.params.projectId]);
      const statuses = pkgs.rows.map(p => p.package_status);
      let projectStatus = 'submitted_agency';
      if (statuses.every(s => s === 'approved')) projectStatus = 'approved';
      else if (statuses.some(s => s === 'submitted_agency')) projectStatus = 'submitted_agency';
      else if (statuses.some(s => s === 'agency_revision')) projectStatus = 'agency_revision';
      else if (statuses.some(s => s === 'customer_revision')) projectStatus = 'customer_revision';
      else if (statuses.some(s => s === 'ready_to_submit')) projectStatus = 'ready_to_submit';

      await tx.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        [projectStatus, req.params.projectId]
      );

      const row = await tx.query('SELECT * FROM doc_agency_submissions WHERE id = ?', [id]);
      return { submission: row.rows[0], nextRound };
    });

    logActivity(req.user.id, 'submit', 'doc_agency_submission', result.submission.id, {
      agency_name,
      submission_round: result.nextRound,
      submitted_date
    });

    // บันทึก timeline 1 ครั้งต่อ 1 submission (ไม่ใช่ทุก checklist)
    const { logTimelineEvent } = require('./doc-review-checklists');
    const firstChecklist = await pool.query(
      'SELECT id, package_id FROM doc_review_checklists WHERE project_id = ? AND package_id IS NOT NULL LIMIT 1',
      [req.params.projectId]
    );
    if (firstChecklist.rows.length > 0) {
      await logTimelineEvent(firstChecklist.rows[0].id, 'submitted', { agency_name, round: result.nextRound }, req.user.id, firstChecklist.rows[0].package_id);
    }

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

      // อัป package_status และ project_status ตามผลตอบกลับจากหน่วยงาน
      if (agency_status) {
        let newPackageStatus = 'submitted_agency';
        if (agency_status === 'approved') newPackageStatus = 'approved';
        else if (agency_status === 'revision_requested') newPackageStatus = 'agency_revision';
        else if (agency_status === 'resubmitted') newPackageStatus = 'submitted_agency';

        // อัป package_status ถ้า submission มี package_id
        if (submission.package_id) {
          await tx.query(
            'UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?',
            [newPackageStatus, submission.package_id]
          );
        }

        // Sync project_status จาก package_status ทั้งหมด
        const pkgs = await tx.query('SELECT package_status FROM doc_submission_packages WHERE project_id = ?', [submission.project_id]);
        const statuses = pkgs.rows.map(p => p.package_status);
        let newProjectStatus = 'submitted_agency';
        if (statuses.every(s => s === 'approved')) newProjectStatus = 'approved';
        else if (statuses.some(s => s === 'submitted_agency')) newProjectStatus = 'submitted_agency';
        else if (statuses.some(s => s === 'agency_revision')) newProjectStatus = 'agency_revision';
        else if (statuses.some(s => s === 'customer_revision')) newProjectStatus = 'customer_revision';
        else if (statuses.some(s => s === 'ready_to_submit')) newProjectStatus = 'ready_to_submit';

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
       LEFT JOIN doc_submission_packages pk ON s.package_id = pk.id
       WHERE s.id IN (
         SELECT id FROM (
           SELECT id, package_id, agency_name,
             ROW_NUMBER() OVER (PARTITION BY package_id, agency_name ORDER BY submission_round DESC) as rn
           FROM doc_agency_submissions
         ) WHERE rn = 1
       )
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

// ============================================================
// DELETE /api/doc-review/submissions/:id
// ============================================================
router.delete('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM doc_agency_submissions WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการยื่น' });
    }

    const submission = existing.rows[0];

    await pool.query('DELETE FROM doc_agency_submissions WHERE id = ?', [req.params.id]);

    // Sync package_status และ project_status หลังลบ
    if (submission.package_id) {
      // ดูว่ายังมี submission อื่นใน package นี้ไหม
      const remaining = await pool.query(
        'SELECT agency_status FROM doc_agency_submissions WHERE package_id = ? ORDER BY submission_round DESC LIMIT 1',
        [submission.package_id]
      );
      let newPkgStatus = 'ready_to_submit'; // ถ้าไม่มี submission เหลือ
      if (remaining.rows.length > 0) {
        const lastStatus = remaining.rows[0].agency_status;
        if (lastStatus === 'approved') newPkgStatus = 'approved';
        else if (lastStatus === 'revision_requested') newPkgStatus = 'agency_revision';
        else newPkgStatus = 'submitted_agency';
      }
      await pool.query(
        'UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?',
        [newPkgStatus, submission.package_id]
      );
    }

    // Sync project_status
    const pkgs = await pool.query('SELECT package_status FROM doc_submission_packages WHERE project_id = ?', [submission.project_id]);
    if (pkgs.rows.length > 0) {
      const statuses = pkgs.rows.map(p => p.package_status);
      let newProjectStatus = 'ready_to_submit';
      if (statuses.every(s => s === 'approved')) newProjectStatus = 'approved';
      else if (statuses.some(s => s === 'submitted_agency')) newProjectStatus = 'submitted_agency';
      else if (statuses.some(s => s === 'agency_revision')) newProjectStatus = 'agency_revision';
      else if (statuses.some(s => s === 'customer_revision')) newProjectStatus = 'customer_revision';
      else if (statuses.some(s => s === 'ready_to_submit')) newProjectStatus = 'ready_to_submit';
      await pool.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        [newProjectStatus, submission.project_id]
      );
    }

    logActivity(req.user.id, 'delete', 'doc_agency_submission', req.params.id, {
      agency_name: submission.agency_name,
      submission_round: submission.submission_round,
      project_id: submission.project_id
    });

    res.json({ message: 'ลบรายการยื่นสำเร็จ' });
  } catch (error) {
    console.error('[DOC_REVIEW_SUBMISSIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
