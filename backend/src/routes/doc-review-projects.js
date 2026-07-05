/**
 * Document Review Projects API
 * จัดการโครงการยื่นเอกสาร
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// Status labels
const PROJECT_STATUS_LABELS = {
  waiting_documents: 'รอเอกสาร',
  internal_review: 'กำลังตรวจ',
  customer_revision: 'รอลูกค้าแก้',
  ready_to_submit: 'พร้อมยื่น',
  submitted_agency: 'ยื่นแล้ว',
  agency_revision: 'หน่วยงานให้แก้',
  approved: 'อนุมัติแล้ว',
};

// ============================================================
// GET /api/doc-review/projects - ดูรายการโครงการทั้งหมด
// ============================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, permit_type, search } = req.query;
    
    let query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE project_id = p.id) as total_docs,
        (SELECT COUNT(*) FROM doc_review_checklists WHERE project_id = p.id AND status = 'passed') as passed_docs,
        u.full_name as owner_name
      FROM doc_review_projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.project_status = ?';
      params.push(status);
    }
    if (permit_type) {
      query += ' AND p.permit_type = ?';
      params.push(permit_type);
    }
    if (search) {
      query += ' AND (p.project_name LIKE ? OR p.customer_name LIKE ? OR p.project_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    
    // Add progress percentage
    const projects = result.rows.map(p => ({
      ...p,
      progress: p.total_docs > 0 ? Math.round((p.passed_docs / p.total_docs) * 100) : 0,
      status_label: PROJECT_STATUS_LABELS[p.project_status] || p.project_status
    }));

    res.json(projects);
  } catch (error) {
    console.error('[DOC_REVIEW_PROJECTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/projects - สร้างโครงการใหม่
// ============================================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      project_code, project_name, customer_name, customer_phone,
      customer_email, customer_line, permit_type, agency, due_date, notes
    } = req.body;

    if (!project_code || !project_name || !permit_type) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // Check duplicate code + permit_type (อนุญาตให้โครงการเดียวกันมีหลายใบอนุญาต)
    const existing = await pool.query(
      'SELECT id, permit_type FROM doc_review_projects WHERE project_code = ? AND permit_type = ?',
      [project_code, permit_type]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'โครงการนี้มีใบอนุญาตประเภทนี้อยู่แล้ว' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO doc_review_projects 
       (id, project_code, project_name, customer_name, customer_phone, customer_email, 
        customer_line, permit_type, agency, project_status, due_date, owner_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_documents', ?, ?, ?)`,
      [id, project_code, project_name, customer_name || null, customer_phone || null,
       customer_email || null, customer_line || null, permit_type, agency || null,
       due_date || null, req.user.id, notes || null]
    );

    logActivity(req.user.id, 'create', 'doc_review_project', id, { project_code, project_name });

    const project = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [id]);
    res.status(201).json(project.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_PROJECTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/dashboard/summary - สรุปทั้งหมด (ต้องอยู่ก่อน /:id)
// ============================================================
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN package_status = 'waiting_documents' THEN 1 END) as waiting_documents,
        COUNT(CASE WHEN package_status = 'internal_review' THEN 1 END) as internal_review,
        COUNT(CASE WHEN package_status = 'customer_revision' THEN 1 END) as customer_revision,
        COUNT(CASE WHEN package_status = 'ready_to_submit' THEN 1 END) as ready_to_submit,
        COUNT(CASE WHEN package_status = 'submitted_agency' THEN 1 END) as submitted_agency,
        COUNT(CASE WHEN package_status = 'agency_revision' THEN 1 END) as agency_revision,
        COUNT(CASE WHEN package_status = 'approved' THEN 1 END) as approved
      FROM doc_submission_packages
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_DASHBOARD]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/projects/:id - ดูรายละเอียดโครงการ
// ============================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.full_name as owner_name
       FROM doc_review_projects p
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const project = result.rows[0];

    // Get checklists with latest file info
    const checklists = await pool.query(
      `SELECT c.*,
        (SELECT file_name FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_name,
        (SELECT version FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_file_version,
        (SELECT received_date FROM doc_review_files WHERE checklist_id = c.id ORDER BY version DESC LIMIT 1) as latest_received_date
       FROM doc_review_checklists c
       WHERE c.project_id = ?
       ORDER BY c.sort_order, c.created_at`,
      [req.params.id]
    );

    // Get latest submission
    const submissions = await pool.query(
      `SELECT * FROM doc_agency_submissions WHERE project_id = ? ORDER BY submission_round DESC`,
      [req.params.id]
    );

    // Get latest approval
    const approvals = await pool.query(
      `SELECT a.*, u.full_name as approver_name
       FROM doc_review_approvals a
       LEFT JOIN users u ON a.approver_id = u.id
       WHERE a.project_id = ?
       ORDER BY a.approved_at DESC LIMIT 1`,
      [req.params.id]
    );

    // Calculate progress
    const totalDocs = checklists.rows.length;
    const passedDocs = checklists.rows.filter(c => c.status === 'passed').length;
    const progress = totalDocs > 0 ? Math.round((passedDocs / totalDocs) * 100) : 0;

    res.json({
      ...project,
      checklists: checklists.rows,
      latest_submission: submissions.rows[0] || null,
      latest_approval: approvals.rows[0] || null,
      total_docs: totalDocs,
      passed_docs: passedDocs,
      progress,
      status_label: PROJECT_STATUS_LABELS[project.project_status] || project.project_status
    });
  } catch (error) {
    console.error('[DOC_REVIEW_PROJECTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/projects/:id - แก้ไขโครงการ
// ============================================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      project_name, customer_name, customer_phone, customer_email,
      customer_line, agency, project_status, due_date, owner_id, notes
    } = req.body;

    const existing = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const setClauses = [];
    const values = [];

    const VALID_PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS);

    if (project_name !== undefined) { setClauses.push('project_name = ?'); values.push(project_name); }
    if (customer_name !== undefined) { setClauses.push('customer_name = ?'); values.push(customer_name); }
    if (customer_phone !== undefined) { setClauses.push('customer_phone = ?'); values.push(customer_phone); }
    if (customer_email !== undefined) { setClauses.push('customer_email = ?'); values.push(customer_email); }
    if (customer_line !== undefined) { setClauses.push('customer_line = ?'); values.push(customer_line); }
    if (agency !== undefined) { setClauses.push('agency = ?'); values.push(agency); }
    if (project_status !== undefined) {
      if (!VALID_PROJECT_STATUSES.includes(project_status)) {
        return res.status(400).json({ error: 'สถานะไม่ถูกต้อง', valid: VALID_PROJECT_STATUSES });
      }
      setClauses.push('project_status = ?'); values.push(project_status);
    }
    if (due_date !== undefined) { setClauses.push('due_date = ?'); values.push(due_date); }
    if (owner_id !== undefined) { setClauses.push('owner_id = ?'); values.push(owner_id); }
    if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = datetime("now")');
    values.push(req.params.id);

    await pool.query(
      `UPDATE doc_review_projects SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    logActivity(req.user.id, 'update', 'doc_review_project', req.params.id, { project_status });

    const result = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_PROJECTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// DELETE /api/doc-review/projects/:id - ลบโครงการ (cascade)
// ============================================================
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM doc_review_projects WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const projectId = req.params.id;
    const projectCode = existing.rows[0].project_code;

    // ดึง packages ทั้งหมดของ project นี้
    const packages = await pool.query('SELECT id FROM doc_submission_packages WHERE project_id = ?', [projectId]);
    const packageIds = packages.rows.map(p => p.id);

    await pool.transaction(async (tx) => {
      if (packageIds.length > 0) {
        const ph = packageIds.map(() => '?').join(',');

        // ดึง checklist IDs ของทุก package
        const checklists = await tx.query(`SELECT id FROM doc_review_checklists WHERE package_id IN (${ph})`, packageIds);
        const checklistIds = checklists.rows.map(c => c.id);

        if (checklistIds.length > 0) {
          const cph = checklistIds.map(() => '?').join(',');

          // ลบลูกของ checklist
          await tx.query(`DELETE FROM document_receipts WHERE checklist_item_id IN (${cph})`, checklistIds);
          await tx.query(`DELETE FROM document_issues WHERE checklist_item_id IN (${cph})`, checklistIds);
          await tx.query(`DELETE FROM doc_review_comments WHERE checklist_id IN (${cph})`, checklistIds);
          await tx.query(`DELETE FROM doc_review_files WHERE checklist_id IN (${cph})`, checklistIds);
        }

        // ลบ checklists
        await tx.query(`DELETE FROM doc_review_checklists WHERE package_id IN (${ph})`, packageIds);

        // ลบลูกของ package
        await tx.query(`DELETE FROM doc_review_approvals WHERE package_id IN (${ph})`, packageIds);
        await tx.query(`DELETE FROM doc_agency_submissions WHERE package_id IN (${ph})`, packageIds);
        await tx.query(`DELETE FROM correction_reports WHERE package_id IN (${ph})`, packageIds);
      }

      // ลบลูกของ project โดยตรง
      await tx.query('DELETE FROM doc_review_approvals WHERE project_id = ?', [projectId]);
      await tx.query('DELETE FROM doc_agency_submissions WHERE project_id = ?', [projectId]);

      // ลบ packages
      await tx.query('DELETE FROM doc_submission_packages WHERE project_id = ?', [projectId]);

      // ลบ project
      await tx.query('DELETE FROM doc_review_projects WHERE id = ?', [projectId]);
    });

    logActivity(req.user.id, 'delete', 'doc_review_project', projectId, { project_code: projectCode });

    res.json({ message: 'ลบโครงการสำเร็จ', deleted: { project: projectCode, packages: packageIds.length } });
  } catch (error) {
    console.error('[DOC_REVIEW_PROJECTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
