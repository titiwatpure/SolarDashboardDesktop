/**
 * Document Review Checklists API
 * จัดการรายการเอกสารที่ต้องตรวจ
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { checklistTemplates } = require('../seed-checklist-templates.cjs');

const router = express.Router();

// ============================================================
// GET /api/doc-review/projects/:projectId/checklists
// ============================================================
router.get('/projects/:projectId/checklists', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
        (SELECT file_name FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_name,
        (SELECT version FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_version,
        (SELECT file_path FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_path
       FROM doc_review_checklists c
       WHERE c.project_id = ?
       ORDER BY c.sort_order, c.created_at`,
      [req.params.projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/projects/:projectId/checklists
// ============================================================
router.post('/projects/:projectId/checklists', authenticateToken, async (req, res) => {
  try {
    const { document_name, description, is_required, sort_order } = req.body;

    if (!document_name) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อเอกสาร' });
    }

    const projectCheck = await pool.query('SELECT id FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO doc_review_checklists (id, project_id, document_name, description, is_required, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.params.projectId, document_name, description || null, is_required !== 0 ? 1 : 0, sort_order || 0]
    );

    logActivity(req.user.id, 'create', 'doc_review_checklist', id, { document_name });

    const result = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/projects/:projectId/checklists/from-template
// ============================================================
router.post('/projects/:projectId/checklists/from-template', authenticateToken, async (req, res) => {
  try {
    const { template_id } = req.body;

    const projectCheck = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    // Find template
    const template = checklistTemplates.find(t => t.id === template_id);
    if (!template) {
      return res.status(404).json({ error: 'ไม่พบ template' });
    }

    // Create checklists from template
    const created = await pool.transaction(async (tx) => {
      const ids = [];
      for (let i = 0; i < template.items.length; i++) {
        const item = template.items[i];
        const id = uuidv4();
        await tx.query(
          `INSERT INTO doc_review_checklists (id, project_id, checklist_template_id, document_name, description, is_required, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, req.params.projectId, template.id, item.title, item.description, item.is_required ? 1 : 0, i + 1]
        );
        ids.push(id);
      }

      // Update project status
      await tx.query(
        'UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?',
        ['waiting_documents', req.params.projectId]
      );

      return ids;
    });

    logActivity(req.user.id, 'create', 'doc_review_checklists', req.params.projectId, {
      template: template.name,
      count: created.length
    });

    res.status(201).json({ message: `สร้าง ${created.length} รายการจาก template "${template.name}"`, count: created.length });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/checklists/:id
// ============================================================
router.put('/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const { document_name, description, is_required, status, sort_order } = req.body;

    const existing = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการเอกสาร' });
    }

    const setClauses = [];
    const values = [];

    const VALID_CHECKLIST_STATUSES = ['pending', 'checking', 'customer_revision', 'passed', 'failed'];

    if (document_name !== undefined) { setClauses.push('document_name = ?'); values.push(document_name); }
    if (description !== undefined) { setClauses.push('description = ?'); values.push(description); }
    if (is_required !== undefined) { setClauses.push('is_required = ?'); values.push(is_required ? 1 : 0); }
    if (status !== undefined) {
      if (!VALID_CHECKLIST_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'สถานะไม่ถูกต้อง', valid: VALID_CHECKLIST_STATUSES });
      }
      setClauses.push('status = ?'); values.push(status);
    }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); values.push(sort_order); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = datetime("now")');
    values.push(req.params.id);

    await pool.query(
      `UPDATE doc_review_checklists SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    logActivity(req.user.id, 'update', 'doc_review_checklist', req.params.id, { status });

    const result = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// DELETE /api/doc-review/checklists/:id
// ============================================================
router.delete('/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการเอกสาร' });
    }

    await pool.query('DELETE FROM doc_review_checklists WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'doc_review_checklist', req.params.id, { document_name: existing.rows[0].document_name });

    res.json({ message: 'ลบรายการเอกสารสำเร็จ' });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// BATCH: บันทึกรับเอกสารที่เลือก
// ============================================================
router.post('/projects/:projectId/checklists/batch-receive', authenticateToken, async (req, res) => {
  try {
    const { checklist_ids, received_from, received_channel, received_date, file_reference, notes } = req.body;
    if (!Array.isArray(checklist_ids) || checklist_ids.length === 0) return res.status(400).json({ error: 'กรุณาระบุรายการ' });
    if (!received_from) return res.status(400).json({ error: 'กรุณาระบุผู้ส่งเอกสาร' });

    const projectCheck = await pool.query('SELECT id FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'ไม่พบโครงการ' });

    const placeholders = checklist_ids.map(() => '?').join(',');
    const items = await pool.query('SELECT id, package_id, status FROM doc_review_checklists WHERE id IN (' + placeholders + ')', checklist_ids);

    const results = { received: [], skipped: [] };
    for (const item of items.rows) {
      if (!['not_received', 'pending', 'customer_revision', 'agency_revision', 'failed'].includes(item.status)) {
        results.skipped.push({ id: item.id, reason: 'สถานะ ' + item.status });
        continue;
      }
      if (!item.package_id) { results.skipped.push({ id: item.id, reason: 'ไม่มี package_id' }); continue; }

      const revResult = await pool.query('SELECT COALESCE(MAX(revision_round), 0) + 1 as next_rev FROM document_receipts WHERE checklist_item_id = ?', [item.id]);

      await pool.query(
        'INSERT INTO document_receipts (id, checklist_item_id, package_id, received_from, received_channel, received_date, revision_round, file_reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [require('uuid').v4(), item.id, item.package_id, received_from, received_channel || 'other', received_date || new Date().toISOString().split('T')[0], revResult.rows[0].next_rev, file_reference || null, notes || null, req.user.id]
      );
      await pool.query("UPDATE doc_review_checklists SET status = 'received', updated_at = datetime('now') WHERE id = ?", [item.id]);
      results.received.push(item.id);
    }

    logActivity(req.user.id, 'batch_receive', 'doc_review_checklist', req.params.projectId, { received: results.received.length, skipped: results.skipped.length });
    res.json({ message: 'รับ ' + results.received.length + ' รายการ', ...results });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// BATCH: ตรวจผ่านรายการที่เลือก
// ============================================================
router.post('/checklists/batch-approve', authenticateToken, async (req, res) => {
  try {
    const { checklist_ids } = req.body;
    if (!Array.isArray(checklist_ids) || checklist_ids.length === 0) return res.status(400).json({ error: 'กรุณาระบุรายการ' });

    const placeholders = checklist_ids.map(() => '?').join(',');
    const items = await pool.query('SELECT id, status, project_id FROM doc_review_checklists WHERE id IN (' + placeholders + ')', checklist_ids);

    const results = { passed: [], skipped: [] };
    for (const item of items.rows) {
      if (!['received', 'checking'].includes(item.status)) {
        results.skipped.push({ id: item.id, reason: 'สถานะ ' + item.status });
        continue;
      }
      const openIssues = await pool.query("SELECT COUNT(*) as c FROM document_issues WHERE checklist_item_id = ? AND status = 'open'", [item.id]);
      if (openIssues.rows[0].c > 0) {
        results.skipped.push({ id: item.id, reason: 'มี Issue เปิดอยู่' });
        continue;
      }
      await pool.query("UPDATE doc_review_checklists SET status = 'passed', updated_at = datetime('now') WHERE id = ?", [item.id]);
      results.passed.push(item.id);
    }
    logActivity(req.user.id, 'batch_approve', 'doc_review_checklist', null, { passed: results.passed.length, skipped: results.skipped.length });
    res.json({ message: 'ผ่าน ' + results.passed.length + ', ข้าม ' + results.skipped.length, ...results });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// BATCH: ส่งกลับแก้รายการที่เลือก
// ============================================================
router.post('/checklists/batch-reject', authenticateToken, async (req, res) => {
  try {
    const { checklist_ids, reason } = req.body;
    if (!Array.isArray(checklist_ids) || checklist_ids.length === 0) return res.status(400).json({ error: 'กรุณาระบุรายการ' });
    if (!reason) return res.status(400).json({ error: 'กรุณาระบุเหตุผล' });

    const placeholders = checklist_ids.map(() => '?').join(',');
    const items = await pool.query('SELECT id, status, project_id, package_id FROM doc_review_checklists WHERE id IN (' + placeholders + ')', checklist_ids);

    let count = 0;
    for (const item of items.rows) {
      if (['passed', 'customer_revision', 'not_received', 'pending'].includes(item.status)) continue;
      await pool.query("UPDATE doc_review_checklists SET status = 'customer_revision', updated_at = datetime('now') WHERE id = ?", [item.id]);
      if (item.package_id) {
        await pool.query(
          "INSERT INTO document_issues (id, checklist_item_id, package_id, issue_source, description, status, created_by) VALUES (?, ?, ?, 'internal', ?, 'open', ?)",
          [require('uuid').v4(), item.id, item.package_id, reason, req.user.id]
        );
      }
      count++;
    }
    logActivity(req.user.id, 'batch_reject', 'doc_review_checklist', null, { count });
    res.json({ message: 'ส่งกลับ ' + count + ' รายการ', count });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
