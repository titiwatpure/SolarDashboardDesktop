/**
 * Document Issues API
 * จัดการปัญหาที่ต้องแก้ไข
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/issues - สร้าง Issue
// ============================================================
router.post('/issues', authenticateToken, async (req, res) => {
  try {
    const { checklist_item_id, package_id, issue_source, description, required_action } = req.body;

    if (!checklist_item_id || !package_id || !description) {
      return res.status(400).json({ error: 'กรุณาระบุรายการเอกสาร ชุดเอกสาร และรายละเอียดปัญหา' });
    }

    const result = await pool.transaction(async (tx) => {
      // ดึง revision_round ปัจจุบัน
      const revResult = await tx.query(
        'SELECT COALESCE(MAX(revision_round), 0) + 1 as next_rev FROM document_issues WHERE checklist_item_id = ?',
        [checklist_item_id]
      );
      const revisionRound = revResult.rows[0].next_rev;

      const id = uuidv4();
      await tx.query(
        `INSERT INTO document_issues (id, checklist_item_id, package_id, issue_source, description, required_action, status, revision_round, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
        [id, checklist_item_id, package_id, issue_source || 'internal', description, required_action || null, revisionRound, req.user.id]
      );

      // อัปเดตสถานะ checklist item
      await tx.query(
        "UPDATE doc_review_checklists SET status = 'customer_revision', updated_at = datetime('now') WHERE id = ?",
        [checklist_item_id]
      );

      const row = await tx.query('SELECT * FROM document_issues WHERE id = ?', [id]);
      return row.rows[0];
    });

    logActivity(req.user.id, 'create', 'document_issue', result.id, { checklist_item_id, issue_source });

    res.status(201).json(result);
  } catch (error) {
    console.error('[DOC_ISSUES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/issues/:id/resolve - แก้ไข Issue
// ============================================================
router.put('/issues/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM document_issues WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Issue' });
    }

    if (existing.rows[0].status === 'resolved') {
      return res.status(400).json({ error: 'Issue นี้แก้ไขแล้ว' });
    }

    const issue = existing.rows[0];

    await pool.transaction(async (tx) => {
      await tx.query(
        "UPDATE document_issues SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?",
        [req.params.id]
      );

      // ตรวจสอบว่า Issue อื่นใน checklist item เดียวกันยังเป็น open หรือไม่
      const openIssues = await tx.query(
        "SELECT COUNT(*) as count FROM document_issues WHERE checklist_item_id = ? AND status = 'open'",
        [issue.checklist_item_id]
      );

      // ถ้าไม่มี Issue ที่ open แล้ว ให้เปลี่ยนสถานะ checklist item เป็น checking
      if (openIssues.rows[0].count === 0) {
        await tx.query(
          "UPDATE doc_review_checklists SET status = 'checking', updated_at = datetime('now') WHERE id = ?",
          [issue.checklist_item_id]
        );
      }
    });

    logActivity(req.user.id, 'resolve', 'document_issue', req.params.id, {});

    res.json({ message: 'แก้ไข Issue สำเร็จ' });
  } catch (error) {
    console.error('[DOC_ISSUES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/issues/packages/:packageId
// ============================================================
router.get('/packages/:packageId/issues', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, u.full_name as created_by_name,
        c.document_name
       FROM document_issues i
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN doc_review_checklists c ON i.checklist_item_id = c.id
       WHERE i.package_id = ?
       ORDER BY i.created_at DESC`,
      [req.params.packageId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_ISSUES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
