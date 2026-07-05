/**
 * Document Submission Packages API
 * จัดการชุดเอกสารที่ต้องยื่น (1 โครงการมีหลายชุด)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { checklistTemplates } = require('../seed-checklist-templates.cjs');

const router = express.Router();

// ============================================================
// GET /api/doc-review/projects/:projectId/packages
// ============================================================
router.get('/projects/:projectId/packages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE package_id = p.id) as total_docs,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE package_id = p.id AND status = 'passed') as passed_docs
       FROM doc_submission_packages p
       WHERE p.project_id = ?
       ORDER BY p.sort_order, p.created_at`,
      [req.params.projectId]
    );

    const packages = result.rows.map(pkg => ({
      ...pkg,
      progress: pkg.total_docs > 0 ? Math.round((pkg.passed_docs / pkg.total_docs) * 100) : 0
    }));

    res.json(packages);
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/projects/:projectId/packages
// ============================================================
router.post('/projects/:projectId/packages', authenticateToken, async (req, res) => {
  try {
    const { package_name, permit_type, agency, due_date, sort_order } = req.body;

    if (!package_name || !permit_type) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อชุดเอกสารและประเภทใบอนุญาต' });
    }

    const projectCheck = await pool.query('SELECT id FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO doc_submission_packages (id, project_id, package_name, permit_type, agency, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.projectId, package_name, permit_type, agency || null, due_date || null, sort_order || 0]
    );

    logActivity(req.user.id, 'create', 'doc_submission_package', id, { package_name, permit_type });

    const result = await pool.query('SELECT * FROM doc_submission_packages WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/packages/:packageId/generate-checklist
// ============================================================
router.post('/packages/:packageId/generate-checklist', authenticateToken, async (req, res) => {
  try {
    const { template_id } = req.body;

    const packageCheck = await pool.query('SELECT * FROM doc_submission_packages WHERE id = ?', [req.params.packageId]);
    if (packageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชุดเอกสาร' });
    }

    // Find template from database
    const templateResult = await pool.query('SELECT * FROM document_checklists WHERE id = ? AND is_template = 1', [template_id]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ template' });
    }
    const template = templateResult.rows[0];

    // Get template items from database
    const itemsResult = await pool.query('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order', [template_id]);
    const templateItems = itemsResult.rows;

    // Create checklists from template
    const created = await pool.transaction(async (tx) => {
      const ids = [];
      for (let i = 0; i < templateItems.length; i++) {
        const item = templateItems[i];
        const id = uuidv4();
        await tx.query(
          `INSERT INTO doc_review_checklists (id, project_id, package_id, checklist_template_id, document_name, description, is_required, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, packageCheck.rows[0].project_id, req.params.packageId, template.id, item.title, item.description, item.is_required ? 1 : 0, i + 1]
        );
        ids.push(id);
      }

      // Update package status
      await tx.query(
        'UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?',
        ['waiting_documents', req.params.packageId]
      );

      return ids;
    });

    logActivity(req.user.id, 'create', 'doc_review_checklists', req.params.packageId, {
      template: template.name,
      count: created.length
    });

    res.status(201).json({ message: `สร้าง ${created.length} รายการจาก template "${template.name}"`, count: created.length });
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/packages/:packageId
// ============================================================
router.get('/packages/:packageId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE package_id = p.id) as total_docs,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE package_id = p.id AND status = 'passed') as passed_docs
       FROM doc_submission_packages p
       WHERE p.id = ?`,
      [req.params.packageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชุดเอกสาร' });
    }

    const pkg = result.rows[0];
    pkg.progress = pkg.total_docs > 0 ? Math.round((pkg.passed_docs / pkg.total_docs) * 100) : 0;

    // Get checklists
    const checklists = await pool.query(
      `SELECT c.*,
        (SELECT file_name FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_name,
        (SELECT version FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_version
       FROM doc_review_checklists c
       WHERE c.package_id = ?
       ORDER BY c.sort_order, c.created_at`,
      [req.params.packageId]
    );

    // Get latest submission
    const submissions = await pool.query(
      `SELECT * FROM doc_agency_submissions WHERE package_id = ? ORDER BY submission_round DESC`,
      [req.params.packageId]
    );

    res.json({
      ...pkg,
      checklists: checklists.rows,
      latest_submission: submissions.rows[0] || null
    });
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/packages/:packageId
// ============================================================
router.put('/packages/:packageId', authenticateToken, async (req, res) => {
  try {
    const { package_name, agency, package_status, due_date, sort_order } = req.body;

    const existing = await pool.query('SELECT * FROM doc_submission_packages WHERE id = ?', [req.params.packageId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชุดเอกสาร' });
    }

    const setClauses = [];
    const values = [];

    const VALID_PACKAGE_STATUSES = ['waiting_documents', 'internal_review', 'customer_revision', 'ready_to_submit', 'submitted_agency', 'agency_revision', 'approved'];

    if (package_name !== undefined) { setClauses.push('package_name = ?'); values.push(package_name); }
    if (agency !== undefined) { setClauses.push('agency = ?'); values.push(agency); }
    if (package_status !== undefined) {
      if (!VALID_PACKAGE_STATUSES.includes(package_status)) {
        return res.status(400).json({ error: 'สถานะไม่ถูกต้อง', valid: VALID_PACKAGE_STATUSES });
      }
      setClauses.push('package_status = ?'); values.push(package_status);
    }
    if (due_date !== undefined) { setClauses.push('due_date = ?'); values.push(due_date); }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); values.push(sort_order); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = datetime("now")');
    values.push(req.params.packageId);

    await pool.query(
      `UPDATE doc_submission_packages SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    logActivity(req.user.id, 'update', 'doc_submission_package', req.params.packageId, { package_status });

    const result = await pool.query('SELECT * FROM doc_submission_packages WHERE id = ?', [req.params.packageId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// DELETE /api/doc-review/packages/:packageId
// ============================================================
router.delete('/packages/:packageId', authenticateToken, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM doc_submission_packages WHERE id = ?', [req.params.packageId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชุดเอกสาร' });
    }

    await pool.query('DELETE FROM doc_submission_packages WHERE id = ?', [req.params.packageId]);
    logActivity(req.user.id, 'delete', 'doc_submission_package', req.params.packageId, { package_name: existing.rows[0].package_name });

    res.json({ message: 'ลบชุดเอกสารสำเร็จ' });
  } catch (error) {
    console.error('[DOC_PACKAGES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
