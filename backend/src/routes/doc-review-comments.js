/**
 * Document Review Comments API
 * จัดการคอมเมนต์ตรวจสอบ
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/checklists/:checklistId/comments
// ============================================================
router.post('/checklists/:checklistId/comments', authenticateToken, async (req, res) => {
  try {
    const { file_id, comment_type, review_status, comment } = req.body;

    if (!review_status) {
      return res.status(400).json({ error: 'กรุณาระบุผลการตรวจ' });
    }

    const checklistCheck = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [req.params.checklistId]);
    if (checklistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการเอกสาร' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO doc_review_comments (id, checklist_id, file_id, comment_type, reviewer_id, review_status, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.checklistId, file_id || null, comment_type || 'internal', req.user.id, review_status, comment || null]
    );

    // Update checklist status based on review
    let newStatus = 'checking';
    if (review_status === 'passed') newStatus = 'passed';
    else if (review_status === 'failed' || review_status === 'needs_revision') newStatus = 'customer_revision';

    await pool.query(
      'UPDATE doc_review_checklists SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [newStatus, req.params.checklistId]
    );

    // Auto-update package_status และ project_status
    const projectCheck = await pool.query(
      'SELECT project_id, package_id FROM doc_review_checklists WHERE id = ?',
      [req.params.checklistId]
    );
    if (projectCheck.rows.length > 0) {
      const { project_id, package_id } = projectCheck.rows[0];
      if (package_id) {
        // เรียก recalculatePackageStatus จาก checklists route
        const { recalculatePackageStatus, syncProjectStatus } = require('./doc-review-checklists');
        await recalculatePackageStatus(package_id);
        await syncProjectStatus(project_id);
      } else {
        await updateProjectStatus(project_id);
      }
    }

    logActivity(req.user.id, 'create', 'doc_review_comment', id, { 
      checklist_id: req.params.checklistId,
      review_status,
      comment_type: comment_type || 'internal'
    });

    // บันทึก timeline
    const { logTimelineEvent } = require('./doc-review-checklists');
    const eventData = { review_status, comment: comment || null };
    if (review_status === 'passed') eventData.action = 'ตรวจผ่าน';
    else if (review_status === 'failed') eventData.action = 'ตรวจไม่ผ่าน';
    else if (review_status === 'needs_revision') eventData.action = 'ส่งกลับแก้ไข';
    await logTimelineEvent(req.params.checklistId, review_status === 'passed' ? 'passed' : review_status === 'failed' ? 'failed' : 'revision', eventData, req.user.id, null);

    const result = await pool.query('SELECT * FROM doc_review_comments WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_COMMENTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/checklists/:checklistId/comments
// ============================================================
router.get('/checklists/:checklistId/comments', authenticateToken, async (req, res) => {
  try {
    const { comment_type } = req.query;

    let query = `
      SELECT c.*, u.full_name as reviewer_name
      FROM doc_review_comments c
      LEFT JOIN users u ON c.reviewer_id = u.id
      WHERE c.checklist_id = ?
    `;
    const params = [req.params.checklistId];

    if (comment_type) {
      query += ' AND c.comment_type = ?';
      params.push(comment_type);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_COMMENTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Helper: Update project status based on checklist statuses
async function updateProjectStatus(projectId) {
  const checklists = await pool.query(
    'SELECT status FROM doc_review_checklists WHERE project_id = ?',
    [projectId]
  );

  const statuses = checklists.rows.map(c => c.status);
  
  let newProjectStatus = 'waiting_documents';
  
  if (statuses.length === 0) {
    newProjectStatus = 'waiting_documents';
  } else if (statuses.every(s => s === 'passed')) {
    newProjectStatus = 'ready_to_submit';
  } else if (statuses.some(s => s === 'customer_revision')) {
    newProjectStatus = 'waiting_customer_revision';
  } else if (statuses.some(s => s === 'checking' || s === 'pending')) {
    newProjectStatus = 'internal_review';
  }

  await pool.query(
    'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
    [newProjectStatus, projectId]
  );
}

module.exports = router;
