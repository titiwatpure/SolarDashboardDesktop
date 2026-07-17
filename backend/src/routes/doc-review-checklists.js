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
// Helper: คำนวณ package_status ใหม่ตาม checklist
// ============================================================
async function recalculatePackageStatus(packageId) {
  try {
    const summary = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_required = 1 THEN 1 ELSE 0 END) as required_total,
        SUM(CASE WHEN is_required = 1 AND status = 'passed' THEN 1 ELSE 0 END) as required_passed,
        SUM(CASE WHEN is_required = 1 AND status IN ('not_received', 'pending') THEN 1 ELSE 0 END) as not_received_count,
        SUM(CASE WHEN is_required = 1 AND status IN ('received', 'checking') THEN 1 ELSE 0 END) as review_count,
        SUM(CASE WHEN is_required = 1 AND status IN ('needs_revision', 'customer_revision', 'failed') THEN 1 ELSE 0 END) as revision_count
      FROM doc_review_checklists
      WHERE package_id = ?
    `, [packageId]);

    const issues = await pool.query(`
      SELECT COUNT(*) as open_issues
      FROM document_issues
      WHERE package_id = ? AND status = 'open'
    `, [packageId]);

    const currentPkg = await pool.query('SELECT package_status FROM doc_submission_packages WHERE id = ?', [packageId]);
    if (currentPkg.rows.length === 0) return;
    const currentStatus = currentPkg.rows[0].package_status;

    // ไม่ overwrite สถานะที่ถูกล็อก
    if (['submitted_agency', 'approved'].includes(currentStatus)) return;

    const s = summary.rows[0];
    const openIssues = issues.rows[0].open_issues;
    let nextStatus = 'waiting_documents';

    if (s.revision_count > 0 || openIssues > 0) {
      nextStatus = 'customer_revision';
    } else if (s.required_total > 0 && s.required_passed === s.required_total) {
      nextStatus = 'ready_to_submit';
    } else if (s.not_received_count > 0) {
      nextStatus = 'waiting_documents';
    } else if (s.review_count > 0) {
      nextStatus = 'internal_review';
    }

    if (nextStatus !== currentStatus) {
      await pool.query('UPDATE doc_submission_packages SET package_status = ?, updated_at = datetime("now") WHERE id = ?', [nextStatus, packageId]);
    }
  } catch (error) {
    console.error('[RECALCULATE_PACKAGE_STATUS]', error);
  }
}

// ============================================================
// Helper: sync project_status จาก package_status ทั้งหมด
// ============================================================
async function syncProjectStatus(projectId) {
  try {
    const pkgs = await pool.query('SELECT package_status FROM doc_submission_packages WHERE project_id = ?', [projectId]);
    if (pkgs.rows.length === 0) return;

    const statuses = pkgs.rows.map(p => p.package_status);
    let projectStatus = 'waiting_documents';

    if (statuses.every(s => s === 'approved')) projectStatus = 'approved';
    else if (statuses.some(s => s === 'submitted_agency')) projectStatus = 'submitted_agency';
    else if (statuses.some(s => s === 'agency_revision')) projectStatus = 'agency_revision';
    else if (statuses.some(s => s === 'customer_revision')) projectStatus = 'customer_revision';
    else if (statuses.some(s => s === 'ready_to_submit')) projectStatus = 'ready_to_submit';
    else if (statuses.some(s => s === 'internal_review')) projectStatus = 'internal_review';

    await pool.query('UPDATE doc_review_projects SET project_status = ?, updated_at = datetime("now") WHERE id = ?', [projectStatus, projectId]);
  } catch (error) {
    console.error('[SYNC_PROJECT_STATUS]', error);
  }
}

// ============================================================
// Helper: บันทึก timeline event
// ============================================================
async function logTimelineEvent(checklistId, eventType, eventData, userId, packageId) {
  try {
    await pool.query(
      `INSERT INTO doc_review_timeline (id, checklist_id, package_id, event_type, event_data, performed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), checklistId, packageId || null, eventType, eventData ? JSON.stringify(eventData) : null, userId]
    );
  } catch (error) {
    console.error('[LOG_TIMELINE]', error);
  }
}

// ============================================================
// GET /api/doc-review/checklists/:id/timeline
// ============================================================
router.get('/checklists/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name as performer_name
       FROM doc_review_timeline t
       LEFT JOIN users u ON t.performed_by = u.id
       WHERE t.checklist_id = ?
       ORDER BY t.created_at ASC`,
      [req.params.id]
    );

    const timeline = result.rows.map(row => ({
      ...row,
      event_data: row.event_data ? JSON.parse(row.event_data) : null
    }));

    res.json(timeline);
  } catch (error) {
    console.error('[DOC_REVIEW_TIMELINE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

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
    const { document_name, description, is_required, sort_order, package_id } = req.body;

    if (!document_name) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อเอกสาร' });
    }

    const projectCheck = await pool.query('SELECT id FROM doc_review_projects WHERE id = ?', [req.params.projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    // ถ้าส่ง package_id มา ให้ตรวจสอบว่า package มีอยู่จริง
    if (package_id) {
      const pkgCheck = await pool.query('SELECT id FROM doc_submission_packages WHERE id = ?', [package_id]);
      if (pkgCheck.rows.length === 0) {
        return res.status(404).json({ error: 'ไม่พบชุดเอกสาร' });
      }
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO doc_review_checklists (id, project_id, package_id, document_name, description, is_required, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.projectId, package_id || null, document_name, description || null, is_required !== 0 ? 1 : 0, sort_order || 0]
    );

    // Recalculate package status ถ้ามี package_id
    if (package_id) {
      await recalculatePackageStatus(package_id);
    }

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

    const VALID_CHECKLIST_STATUSES = ['pending', 'received', 'checking', 'customer_revision', 'passed', 'failed'];

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

    // บันทึก timeline ถ้าสถานะเปลี่ยน
    if (status) {
      const eventData = {};
      if (status === 'checking') eventData.action = 'เริ่มตรวจสอบ';
      else if (status === 'passed') eventData.action = 'ตรวจผ่าน';
      else if (status === 'failed') eventData.action = 'ตรวจไม่ผ่าน';
      else if (status === 'customer_revision') eventData.action = 'ส่งกลับแก้ไข';
      await logTimelineEvent(req.params.id, status, eventData, req.user.id, existing.rows[0].package_id);
    }

    // Recalculate package_status เมื่อ status หรือ is_required เปลี่ยน
    const packageId = existing.rows[0].package_id;
    const projectId = existing.rows[0].project_id;
    if (packageId && (status !== undefined || is_required !== undefined)) {
      await recalculatePackageStatus(packageId);
      await syncProjectStatus(projectId);
    }

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

    // Recalculate เพราะการลบกระทบ required_total / required_passed
    const packageId = existing.rows[0].package_id;
    const projectId = existing.rows[0].project_id;
    if (packageId) {
      await recalculatePackageStatus(packageId);
      await syncProjectStatus(projectId);
    }

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
      await logTimelineEvent(item.id, 'received', { received_from, received_channel, file_reference }, req.user.id, item.package_id);
      results.received.push(item.id);
    }

    // Recalculate package_status สำหรับแต่ละ package ที่ได้รับผลกระทบ
    const affectedPackages = [...new Set(items.rows.filter(i => results.received.includes(i.id)).map(i => i.package_id).filter(Boolean))];
    for (const pkgId of affectedPackages) {
      await recalculatePackageStatus(pkgId);
      await syncProjectStatus((await pool.query('SELECT project_id FROM doc_submission_packages WHERE id = ?', [pkgId])).rows[0]?.project_id);
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
      await logTimelineEvent(item.id, 'passed', {}, req.user.id, null);
      results.passed.push(item.id);
    }

    // Recalculate package_status สำหรับแต่ละ package ที่ได้รับผลกระทบ
    const affectedPackages = [...new Set(items.rows.filter(i => results.passed.includes(i.id)).map(i => i.project_id).filter(Boolean))];
    for (const projId of affectedPackages) {
      const pkgRows = await pool.query('SELECT id FROM doc_submission_packages WHERE project_id = ?', [projId]);
      for (const pkg of pkgRows.rows) {
        await recalculatePackageStatus(pkg.id);
      }
      await syncProjectStatus(projId);
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
      await logTimelineEvent(item.id, 'revision', { reason }, req.user.id, item.package_id);
      if (item.package_id) {
        await pool.query(
          "INSERT INTO document_issues (id, checklist_item_id, package_id, issue_source, description, status, created_by) VALUES (?, ?, ?, 'internal', ?, 'open', ?)",
          [require('uuid').v4(), item.id, item.package_id, reason, req.user.id]
        );
      }
      count++;
    }

    // Recalculate package_status สำหรับแต่ละ package ที่ได้รับผลกระทบ
    const affectedPackages = [...new Set(items.rows.filter(i => ['passed', 'customer_revision', 'not_received', 'pending'].includes(i.status) === false).map(i => i.package_id).filter(Boolean))];
    for (const pkgId of affectedPackages) {
      await recalculatePackageStatus(pkgId);
      await syncProjectStatus((await pool.query('SELECT project_id FROM doc_submission_packages WHERE id = ?', [pkgId])).rows[0]?.project_id);
    }

    logActivity(req.user.id, 'batch_reject', 'doc_review_checklist', null, { count });
    res.json({ message: 'ส่งกลับ ' + count + ' รายการ', count });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// BATCH: ผ่านทุกรายการที่เลือก (ไม่จำกัดสถานะ)
// ============================================================
router.post('/checklists/batch-force-pass', authenticateToken, async (req, res) => {
  try {
    const { checklist_ids } = req.body;
    if (!Array.isArray(checklist_ids) || checklist_ids.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุรายการ' });
    }

    const placeholders = checklist_ids.map(() => '?').join(',');
    const items = await pool.query(
      'SELECT id, status, project_id, package_id FROM doc_review_checklists WHERE id IN (' + placeholders + ')',
      checklist_ids
    );

    const passed = [];
    const skipped = [];
    for (const item of items.rows) {
      if (item.status === 'passed') {
        skipped.push({ id: item.id, reason: 'ผ่านแล้ว' });
        continue;
      }
      await pool.query(
        "UPDATE doc_review_checklists SET status = 'passed', updated_at = datetime('now') WHERE id = ?",
        [item.id]
      );
      await logTimelineEvent(item.id, 'passed', { force: true }, req.user.id, item.package_id);
      passed.push(item.id);
    }

    // Recalculate package_status และ project_status
    const affectedPackages = [...new Set(items.rows.filter(i => passed.includes(i.id)).map(i => i.package_id).filter(Boolean))];
    for (const pkgId of affectedPackages) {
      await recalculatePackageStatus(pkgId);
      const pkgRow = await pool.query('SELECT project_id FROM doc_submission_packages WHERE id = ?', [pkgId]);
      if (pkgRow.rows[0]?.project_id) {
        await syncProjectStatus(pkgRow.rows[0].project_id);
      }
    }

    logActivity(req.user.id, 'batch_force_pass', 'doc_review_checklist', null, { passed: passed.length, skipped: skipped.length });
    res.json({ message: 'ผ่าน ' + passed.length + ', ข้าม ' + skipped.length, passed, skipped });
  } catch (error) {
    console.error('[DOC_REVIEW_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/pending-revisions
// รวม checklist ที่ status = customer_revision ทุกโครงการ
// ============================================================
router.get('/pending-revisions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.document_name, c.description, c.status, c.is_required,
        c.updated_at as checklist_updated_at,
        p.id as project_id, p.project_code, p.project_name, p.project_status,
        pkg.id as package_id, pkg.permit_type, pkg.package_status,
        (SELECT event_data FROM doc_review_timeline
         WHERE checklist_id = c.id AND event_type = 'revision'
         ORDER BY created_at DESC LIMIT 1) as revision_reason
      FROM doc_review_checklists c
      JOIN doc_review_projects p ON c.project_id = p.id
      LEFT JOIN doc_submission_packages pkg ON c.package_id = pkg.id
      WHERE c.status = 'customer_revision'
      ORDER BY c.updated_at DESC
    `);

    const items = result.rows.map(row => ({
      ...row,
      revision_reason: row.revision_reason ? JSON.parse(row.revision_reason) : null
    }));

    res.json(items);
  } catch (error) {
    console.error('[DOC_REVIEW_PENDING_REVISIONS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/ready-to-submit
// checklist ที่ status=passed แต่ยังไม่ได้ยื่นหน่วยงาน
// ============================================================
router.get('/ready-to-submit', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.document_name, c.description, c.is_required,
        c.updated_at as passed_at,
        p.id as project_id, p.project_code, p.project_name,
        pkg.id as package_id, pkg.permit_type, pkg.package_status,
        (SELECT COUNT(*) FROM doc_agency_submissions
         WHERE project_id = p.id AND agency_name = pkg.permit_type) as submission_count
      FROM doc_review_checklists c
      JOIN doc_review_projects p ON c.project_id = p.id
      LEFT JOIN doc_submission_packages pkg ON c.package_id = pkg.id
      WHERE c.status = 'passed'
        AND pkg.package_status NOT IN ('submitted_agency', 'approved')
      ORDER BY c.updated_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_READY_TO_SUBMIT]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/open-issues
// รวมปัญหาเอกสารที่ status=open ทุก package
// ============================================================
router.get('/open-issues', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id, i.description, i.required_action, i.issue_source,
        i.revision_round, i.status, i.created_at,
        c.document_name, c.id as checklist_id,
        p.id as project_id, p.project_code, p.project_name,
        pkg.id as package_id, pkg.permit_type,
        u.full_name as created_by_name
      FROM document_issues i
      JOIN doc_review_checklists c ON i.checklist_item_id = c.id
      JOIN doc_review_projects p ON c.project_id = p.id
      LEFT JOIN doc_submission_packages pkg ON i.package_id = pkg.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.status = 'open'
      ORDER BY i.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_OPEN_ISSUES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
module.exports.recalculatePackageStatus = recalculatePackageStatus;
module.exports.syncProjectStatus = syncProjectStatus;
module.exports.logTimelineEvent = logTimelineEvent;
