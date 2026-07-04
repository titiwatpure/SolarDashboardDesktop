/**
 * Correction Reports API
 * รายงานส่งลูกค้า
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/correction-reports - สร้างรายงานส่งลูกค้า
// ============================================================
router.post('/correction-reports', authenticateToken, async (req, res) => {
  try {
    const { package_id, issue_ids } = req.body;

    if (!package_id || !issue_ids || !Array.isArray(issue_ids)) {
      return res.status(400).json({ error: 'กรุณาระบุชุดเอกสารและรายการปัญหา' });
    }

    // ตรวจสอบว่า issue_ids ทั้งหมดเป็นของ package นี้
    if (issue_ids.length > 0) {
      const validIssues = await pool.query(
        `SELECT id FROM document_issues WHERE package_id = ? AND id IN (${issue_ids.map(() => '?').join(',')})`,
        [package_id, ...issue_ids]
      );
      if (validIssues.rows.length !== issue_ids.length) {
        return res.status(400).json({ error: 'มี issue บางรายการไม่ได้เป็นของชุดเอกสารนี้' });
      }
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO correction_reports (id, package_id, issues, exported_format, exported_at, created_by)
       VALUES (?, ?, ?, 'pdf', datetime('now'), ?)`,
      [id, package_id, JSON.stringify(issue_ids), req.user.id]
    );

    logActivity(req.user.id, 'create', 'correction_report', id, { package_id, issue_count: issue_ids.length });

    const result = await pool.query('SELECT * FROM correction_reports WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[CORRECTION_REPORTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/correction-reports/:id
// ============================================================
router.get('/correction-reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.full_name as created_by_name,
        p.package_name, pr.project_name, pr.project_code
       FROM correction_reports cr
       LEFT JOIN users u ON cr.created_by = u.id
       LEFT JOIN doc_submission_packages p ON cr.package_id = p.id
       LEFT JOIN doc_review_projects pr ON p.project_id = pr.id
       WHERE cr.id = ?`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายงาน' });
    }

    const report = result.rows[0];
    
    // ดึงรายละเอียด issues
    const issueIds = JSON.parse(report.issues || '[]').filter(id => typeof id === 'string' && id.length > 0);
    if (issueIds.length > 0) {
      const issues = await pool.query(
        `SELECT i.*, c.document_name
         FROM document_issues i
         LEFT JOIN doc_review_checklists c ON i.checklist_item_id = c.id
         WHERE i.id IN (${issueIds.map(() => '?').join(',')})`,
        issueIds
      );
      report.issue_details = issues.rows;
    }

    res.json(report);
  } catch (error) {
    console.error('[CORRECTION_REPORTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
