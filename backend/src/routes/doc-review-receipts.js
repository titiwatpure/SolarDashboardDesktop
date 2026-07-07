/**
 * Document Receipts API
 * บันทึกการรับเอกสารจากลูกค้า
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// POST /api/doc-review/receipts - บันทึกการรับเอกสาร
// ============================================================
router.post('/receipts', authenticateToken, async (req, res) => {
  try {
    const { checklist_item_id, package_id, received_from, received_channel, received_date, notes } = req.body;

    if (!checklist_item_id || !package_id) {
      return res.status(400).json({ error: 'กรุณาระบุรายการเอกสารและชุดเอกสาร' });
    }

    // ตรวจสอบว่า checklist item มีอยู่จริง
    const itemCheck = await pool.query('SELECT id FROM doc_review_checklists WHERE id = ?', [checklist_item_id]);
    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการเอกสาร' });
    }

    const result = await pool.transaction(async (tx) => {
      // ดึง revision_round ปัจจุบัน
      const revResult = await tx.query(
        'SELECT COALESCE(MAX(revision_round), 0) + 1 as next_rev FROM document_receipts WHERE checklist_item_id = ?',
        [checklist_item_id]
      );
      const revisionRound = revResult.rows[0].next_rev;

      const id = uuidv4();
      await tx.query(
        `INSERT INTO document_receipts (id, checklist_item_id, package_id, received_from, received_channel, received_date, revision_round, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, checklist_item_id, package_id, received_from || null, received_channel || 'other', received_date || new Date().toISOString().split('T')[0], revisionRound, notes || null, req.user.id]
      );

      // อัปเดตสถานะ checklist item
      await tx.query(
        "UPDATE doc_review_checklists SET status = 'checking', updated_at = datetime('now') WHERE id = ?",
        [checklist_item_id]
      );

      const row = await tx.query('SELECT * FROM document_receipts WHERE id = ?', [id]);
      return row.rows[0];
    });

    logActivity(req.user.id, 'create', 'document_receipt', result.id, { checklist_item_id, revision_round: result.revision_round });

    // บันทึก timeline
    const { logTimelineEvent } = require('./doc-review-checklists');
    await logTimelineEvent(checklist_item_id, 'received', { received_from, received_channel, revision_round: result.revision_round }, req.user.id, package_id);

    res.status(201).json(result);
  } catch (error) {
    console.error('[DOC_RECEIPTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/receipts/checklists/:checklistId
// ============================================================
router.get('/receipts/checklists/:checklistId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name as created_by_name
       FROM document_receipts r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.checklist_item_id = ?
       ORDER BY r.revision_round DESC, r.created_at DESC`,
      [req.params.checklistId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_RECEIPTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
