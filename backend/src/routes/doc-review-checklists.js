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

module.exports = router;
