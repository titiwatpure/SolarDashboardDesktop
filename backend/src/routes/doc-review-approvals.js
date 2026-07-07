/**
 * Document Review Approvals API
 * อนุมัติภายใน
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizePermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/projects/:projectId/approve
// ============================================================
router.post('/projects/:projectId/approve', authenticateToken, authorizePermission('checkpoint.approve'), async (req, res) => {
  try {
    const { comment, package_id } = req.body;

    const projectCheck = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    // Check required documents — ถ้ามี package_id ให้ตรวจเฉพาะ package นั้น ไม่ใช่ทั้งโครงการ
    let pendingDocs;
    if (package_id) {
      pendingDocs = await pool.query(
        `SELECT COUNT(*) as count FROM doc_review_checklists 
         WHERE package_id = ? AND is_required = 1 AND status != 'passed'`,
        [package_id]
      );
    } else {
      pendingDocs = await pool.query(
        `SELECT COUNT(*) as count FROM doc_review_checklists 
         WHERE project_id = ? AND is_required = 1 AND status != 'passed'`,
        [req.params.projectId]
      );
    }

    if (pendingDocs.rows[0].count > 0) {
      return res.status(400).json({ 
        error: `ยังมีเอกสารจำเป็น ${pendingDocs.rows[0].count} รายการที่ยังไม่ผ่าน`,
        pending_count: pendingDocs.rows[0].count
      });
    }

    await pool.transaction(async (tx) => {
      const id = uuidv4();
      await tx.query(
        `INSERT INTO doc_review_approvals (id, project_id, package_id, approver_id, approval_status, comment)
         VALUES (?, ?, ?, ?, 'approved', ?)`,
        [id, req.params.projectId, package_id || null, req.user.id, comment || 'เอกสารครบถ้วน พร้อมยื่นหน่วยงาน']
      );

      // ถ้าอนุมัติระดับ package → อัปเดต package_status เป็น ready_to_submit
      if (package_id) {
        await tx.query(
          'UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?',
          ['ready_to_submit', package_id]
        );
      }

      // Sync project_status จาก package_status ทั้งหมด
      const pkgs = await tx.query('SELECT package_status FROM doc_submission_packages WHERE project_id = ?', [req.params.projectId]);
      const statuses = pkgs.rows.map(p => p.package_status);
      let projectStatus = 'waiting_documents';
      if (statuses.every(s => s === 'approved')) projectStatus = 'approved';
      else if (statuses.some(s => s === 'submitted_agency')) projectStatus = 'submitted_agency';
      else if (statuses.some(s => s === 'agency_revision')) projectStatus = 'agency_revision';
      else if (statuses.some(s => s === 'customer_revision')) projectStatus = 'customer_revision';
      else if (statuses.some(s => s === 'ready_to_submit')) projectStatus = 'ready_to_submit';
      else if (statuses.some(s => s === 'internal_review')) projectStatus = 'internal_review';

      await tx.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        [projectStatus, req.params.projectId]
      );
    });

    logActivity(req.user.id, 'approve', 'doc_review_project', req.params.projectId, { comment, package_id });

    res.json({ message: 'อนุมัติสำเร็จ พร้อมยื่นหน่วยงาน' });
  } catch (error) {
    console.error('[DOC_REVIEW_APPROVALS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/projects/:projectId/reject
// ============================================================
router.post('/projects/:projectId/reject', authenticateToken, authorizePermission('checkpoint.approve'), async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ตีกลับ' });
    }

    const projectCheck = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    await pool.transaction(async (tx) => {
      const id = uuidv4();
      await tx.query(
        `INSERT INTO doc_review_approvals (id, project_id, approver_id, approval_status, comment)
         VALUES (?, ?, ?, 'rejected', ?)`,
        [id, req.params.projectId, req.user.id, comment]
      );

      // Update project status
      await tx.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        ['internal_review', req.params.projectId]
      );
    });

    logActivity(req.user.id, 'reject', 'doc_review_project', req.params.projectId, { comment });

    res.json({ message: 'ตีกลับสำเร็จ' });
  } catch (error) {
    console.error('[DOC_REVIEW_APPROVALS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/projects/:projectId/approvals
// ============================================================
router.get('/projects/:projectId/approvals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name as approver_name
       FROM doc_review_approvals a
       LEFT JOIN users u ON a.approver_id = u.id
       WHERE a.project_id = ?
       ORDER BY a.approved_at DESC`,
      [req.params.projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_APPROVALS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
