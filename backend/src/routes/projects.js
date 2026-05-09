const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole, authorizePermission, hasPermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { createNotification } = require('./notifications');
const { calculateRisk } = require('../services/riskDetection');

const router = express.Router();

// Valid status transitions
const STATUS_TRANSITIONS = {
  not_started: ['in_progress', 'blocked'],
  in_progress: ['waiting', 'blocked', 'completed', 'rejected'],
  waiting: ['in_progress', 'blocked', 'completed', 'rejected'],
  blocked: ['in_progress', 'waiting', 'rejected'],
  rejected: ['in_progress', 'not_started'],
  completed: [],
};

const getProjectById = async (id) => {
  const result = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// Auto-create default checkpoints for a step
const createDefaultCheckpoints = async (projectId, step, userId) => {
  const checkpointDefs = {
    survey: ['สำรวจพื้นที่', 'ตรวจสอบโครงสร้างหลังคา', 'ประเมินระบบไฟฟ้า'],
    design: ['ออกแบบ Single Line Diagram', 'คำนวณขนาดระบบ', 'อนุมัติแบบ'],
    erc: ['ยื่นเอกสาร กกพ.', 'ได้รับหนังสืออนุมัติ'],
    grid: ['ยื่นขอต่อสาย PEA/MEA', 'ได้รับอนุมัติต่อสาย', 'ติดตั้งมิเตอร์'],
    construction: ['ติดตั้งโครงสร้าง', 'ติดตั้งแผงโซลาร์', 'ติดตั้งอินเวอร์เตอร์', 'เดินสายไฟ'],
    testing: ['ทดสอบระบบ', 'ตรวจสอบความปลอดภัย', 'ทดสอบการจ่ายไฟ'],
    cod: ['ส่งมอบงาน', 'อบรมการใช้งาน', 'ปิดโครงการ'],
  };

  const defs = checkpointDefs[step] || [];
  for (const name of defs) {
    const cpId = uuidv4();
    await pool.query(
      `INSERT INTO checkpoints (id, project_id, step, checkpoint_name, status, required, assigned_to)
       VALUES (?, ?, ?, ?, 'pending', 1, ?)`,
      [cpId, projectId, step, name, userId]
    );
    await pool.query(
      `INSERT INTO checkpoint_logs (id, checkpoint_id, action, new_status, reason, performed_by)
       VALUES (?, ?, 'created', 'pending', 'Auto-created on step entry', ?)`,
      [uuidv4(), cpId, userId]
    );
  }
};

// GET /api/projects/stats/kpis
router.get('/stats/kpis', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(CASE WHEN permit_type = 'exemption' THEN 1 END) as exemption,
        COUNT(CASE WHEN permit_type = 'permit' THEN 1 END) as permit,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk
      FROM projects
    `);

    res.json(result.rows[0] || {
      total_projects: 0, exemption: 0, permit: 0, completed: 0, blocked: 0,
      critical_risk: 0, high_risk: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

const buildFilter = (filters) => {
  const { province, status, current_step, search, risk_level } = filters;
  let clause = '';
  const params = [];

  if (province) { clause += ' AND province = ?'; params.push(province); }
  if (status) { clause += ' AND status = ?'; params.push(status); }
  if (current_step) { clause += ' AND current_step = ?'; params.push(current_step); }
  if (risk_level) { clause += ' AND risk_level = ?'; params.push(risk_level); }
  if (search) {
    clause += ' AND (project_name LIKE ? OR project_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  return { clause, params };
};

// GET /api/projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { province, status, current_step, search, risk_level } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filters = { province, status, current_step, search, risk_level };
    const { clause, params } = buildFilter(filters);

    const query = `
      SELECT p.*,
        u.full_name as responsible_user_name,
        (
          SELECT GROUP_CONCAT(o.org_name, ', ')
          FROM project_organizations po
          JOIN organizations o ON po.org_id = o.id
          WHERE po.project_id = p.id
        ) as organizations
      FROM projects p
      LEFT JOIN users u ON p.responsible_user = u.id
      WHERE 1=1${clause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`;
    const result = await pool.query(query, [...params, limit, (page - 1) * limit]);

    const countQuery = `SELECT COUNT(*) as count FROM projects WHERE 1=1${clause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id/organizations
router.get('/:id/organizations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.org_name, o.org_type, po.approval_status, po.approved_at, po.rejection_reason
       FROM project_organizations po
       JOIN organizations o ON po.org_id = o.id
       WHERE po.project_id = ?
       ORDER BY o.org_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects/:id/organizations
router.post('/:id/organizations', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { org_id, role } = req.body;
    if (!org_id) return res.status(400).json({ error: 'กรุณาระบุ org_id' });

    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [req.params.id]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'ไม่พบโครงการ' });

    const orgCheck = await pool.query('SELECT id FROM organizations WHERE id = ?', [org_id]);
    if (orgCheck.rows.length === 0) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });

    const existing = await pool.query(
      'SELECT id FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [req.params.id, org_id]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: 'หน่วยงานนี้เชื่อมกับโครงการแล้ว' });

    await pool.query(
      'INSERT INTO project_organizations (id, project_id, org_id, role, approval_status) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, org_id, role || null, 'pending']
    );

    logActivity(req.user.id, 'create', 'project_organization', req.params.id, { org_id, role });
    res.status(201).json({ message: 'เชื่อมหน่วยงานสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects/:id/organizations/:orgId/approve
router.post('/:id/organizations/:orgId/approve', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { id, orgId } = req.params;
    const { reason } = req.body;

    const existing = await pool.query(
      'SELECT * FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [id, orgId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบการเชื่อมต่อ' });

    await pool.query(
      `UPDATE project_organizations SET approval_status = 'approved', approved_at = ?, approved_by = ? WHERE project_id = ? AND org_id = ?`,
      [new Date().toISOString(), req.user.id, id, orgId]
    );

    await pool.query(
      `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, 'org_approval', 'approved', `อนุมัติโดยหน่วยงาน: ${reason || 'อนุมัติ'}`, req.user.id]
    );

    logActivity(req.user.id, 'approve', 'project_organization', id, { org_id: orgId, reason });
    res.json({ message: 'อนุมัติสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects/:id/organizations/:orgId/reject
router.post('/:id/organizations/:orgId/reject', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { id, orgId } = req.params;
    const { reason } = req.body;

    const existing = await pool.query(
      'SELECT * FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [id, orgId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบการเชื่อมต่อ' });

    await pool.query(
      `UPDATE project_organizations SET approval_status = 'rejected', rejection_reason = ?, approved_at = ?, approved_by = ? WHERE project_id = ? AND org_id = ?`,
      [reason || 'ไม่ระบุเหตุผล', new Date().toISOString(), req.user.id, id, orgId]
    );

    await pool.query(
      `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, 'org_approval', 'rejected', `ไม่อนุมัติโดยหน่วยงาน: ${reason || 'ไม่ระบุเหตุผล'}`, req.user.id]
    );

    logActivity(req.user.id, 'reject', 'project_organization', id, { org_id: orgId, reason });
    res.json({ message: 'ปฏิเสธสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/projects/:id/organizations/:orgId
router.delete('/:id/organizations/:orgId', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [req.params.id, req.params.orgId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'ไม่พบการเชื่อมต่อ' });

    logActivity(req.user.id, 'delete', 'project_organization', req.params.id, { org_id: req.params.orgId });
    res.json({ message: 'ลบการเชื่อมต่อสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.full_name as responsible_user_name
       FROM projects p
       LEFT JOIN users u ON p.responsible_user = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'ไม่พบโครงการ' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects
router.post('/', authenticateToken, authorizePermission('project.create'), async (req, res) => {
  try {
    const {
      project_name, project_code, size_kw, size_kva, province,
      responsible_user, description, has_power_selling, start_date,
    } = req.body;

    if (!project_name || !project_code || !size_kw || !province) {
      return res.status(400).json({ error: 'ข้อมูลโครงการไม่ครบถ้วน' });
    }

    const sizeKwNum = Number(size_kw);
    if (isNaN(sizeKwNum) || sizeKwNum < 0) {
      return res.status(400).json({ error: 'ขนาด kW ต้องเป็นตัวเลข' });
    }

    if (size_kva !== undefined && size_kva !== null && size_kva !== '') {
      const sizeKvaNum = Number(size_kva);
      if (isNaN(sizeKvaNum) || sizeKvaNum < 0) {
        return res.status(400).json({ error: 'ขนาด kVA ต้องเป็นตัวเลข' });
      }
    }

    if (responsible_user) {
      const userCheck = await pool.query('SELECT id FROM users WHERE id = ?', [responsible_user]);
      if (userCheck.rows.length === 0) return res.status(400).json({ error: 'ไม่พบผู้รับผิดชอบ' });
    }

    const duplicate = await pool.query('SELECT id FROM projects WHERE project_code = ?', [project_code]);
    if (duplicate.rows.length > 0) return res.status(400).json({ error: 'รหัสโครงการมีอยู่แล้ว' });

    let requiresPermit = false;
    let permitType = null;
    if (has_power_selling || (size_kva && Number(size_kva) > 1000)) {
      requiresPermit = true;
      permitType = 'permit';
    } else if (size_kva && Number(size_kva) <= 1000 && !has_power_selling) {
      requiresPermit = true;
      permitType = 'exemption';
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO projects (
        id, project_name, project_code, size_kw, size_kva, province,
        responsible_user, description, has_power_selling, requires_permit,
        permit_type, start_date, status, current_step, risk_level, risk_factors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, project_name, project_code, Number(size_kw),
        size_kva ? Number(size_kva) : null, province,
        responsible_user || null, description || null,
        has_power_selling ? 1 : 0, requiresPermit ? 1 : 0,
        permitType, start_date || null, 'not_started', 'survey',
        'low', '{}',
      ]
    );

    // Create default checkpoints for survey step
    await createDefaultCheckpoints(id, 'survey', req.user.id);

    const project = await getProjectById(id);
    logActivity(req.user.id, 'create', 'project', id, { project_name, project_code });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id/timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const result = await pool.query(
      `SELECT t.*, u.full_name as changed_by_name
       FROM project_timeline t
       LEFT JOIN users u ON t.changed_by = u.id
       WHERE t.project_id = ?
       ORDER BY t.created_at DESC
       LIMIT ?`,
      [req.params.id, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/projects/:id/timeline/:timelineId
router.delete('/:id/timeline/:timelineId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id, timelineId } = req.params;
    const existing = await pool.query(
      'SELECT id FROM project_timeline WHERE id = ? AND project_id = ?', [timelineId, id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบรายการ timeline' });

    await pool.query('DELETE FROM project_timeline WHERE id = ?', [timelineId]);
    res.json({ message: 'ลบรายการ timeline สำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = [
      'project_name', 'province', 'status', 'current_step',
      'responsible_user', 'description', 'has_power_selling',
      'blocked_reason', 'blocked_by', 'actual_cod_date', 'expected_cod_date',
      'size_kw', 'size_kva', 'start_date',
    ];

    const existing = await getProjectById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบโครงการ' });

    // Permission check
    if (req.user.role !== 'admin' && existing.responsible_user !== req.user.id) {
      if (!hasPermission(req.user.role, 'project.update.all')) {
        return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขโครงการนี้' });
      }
    }

    // Validate status transition
    if (updates.status && updates.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(updates.status)) {
        return res.status(400).json({
          error: `ไม่สามารถเปลี่ยนสถานะจาก "${existing.status}" เป็น "${updates.status}" ได้`,
          allowed_transitions: allowed,
        });
      }
    }

    const setClauses = [];
    const values = [];

    for (const [key, rawValue] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      let value = rawValue;
      if (key === 'has_power_selling') value = rawValue ? 1 : 0;
      if ((key === 'size_kw' || key === 'size_kva') && rawValue !== '' && rawValue != null) {
        value = Number(rawValue);
        if (isNaN(value)) return res.status(400).json({ error: `${key} ต้องเป็นตัวเลข` });
      }
      setClauses.push(`${key} = ?`);
      values.push(value === '' ? null : value);
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);

    // Status transition logic
    const newStatus = updates.status || existing.status;
    const statusChanged = updates.status && updates.status !== existing.status;
    if (statusChanged) {
      if (newStatus === 'blocked') {
        await pool.query('UPDATE projects SET blocked_date = ? WHERE id = ?', [new Date().toISOString(), id]);
      } else if (existing.status === 'blocked') {
        await pool.query('UPDATE projects SET blocked_date = NULL, blocked_reason = NULL, blocked_by = NULL WHERE id = ?', [id]);
      }
      if (newStatus === 'completed') {
        await pool.query('UPDATE projects SET actual_cod_date = ? WHERE id = ?', [new Date().toISOString(), id]);
      }
    }

    // Recalculate permit fields
    const permitFieldsChanged = updates.size_kw !== undefined || updates.size_kva !== undefined || updates.has_power_selling !== undefined;
    if (permitFieldsChanged) {
      const newSizeKva = updates.size_kva !== undefined ? Number(updates.size_kva) : existing.size_kva;
      const newPowerSelling = updates.has_power_selling !== undefined ? updates.has_power_selling : existing.has_power_selling;
      let requiresPermit = 0;
      let permitType = null;
      if (newPowerSelling || (newSizeKva && newSizeKva > 1000)) {
        requiresPermit = 1;
        permitType = 'permit';
      } else if (newSizeKva && newSizeKva <= 1000 && !newPowerSelling) {
        requiresPermit = 1;
        permitType = 'exemption';
      }
      await pool.query('UPDATE projects SET requires_permit = ?, permit_type = ? WHERE id = ?', [requiresPermit, permitType, id]);
    }

    // Step/status change → timeline + auto-checkpoints
    const newStep = updates.current_step || existing.current_step;
    const stepChanged = updates.current_step && updates.current_step !== existing.current_step;

    if (stepChanged || statusChanged) {
      await pool.query(
        `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, newStep, newStatus, updates.blocked_reason || null, req.user.id]
      );

      // Auto-create checkpoints for new step
      if (stepChanged) {
        await createDefaultCheckpoints(id, newStep, req.user.id);
      }
    }

    // Recalculate risk level
    await calculateRisk(id);

    const result = await pool.query(
      `SELECT p.*, u.full_name as responsible_user_name FROM projects p LEFT JOIN users u ON p.responsible_user = u.id WHERE p.id = ?`,
      [id]
    );

    logActivity(req.user.id, 'update', 'project', id, { fields: Object.keys(updates) });

    // Notification
    if (statusChanged && existing.responsible_user && existing.responsible_user !== req.user.id) {
      createNotification(
        existing.responsible_user, 'status_change', 'สถานะโครงการเปลี่ยน',
        `โครงการ "${existing.project_name}" เปลี่ยนสถานะเป็น "${newStatus}"`,
        'project', id
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticateToken, authorizePermission('project.delete'), async (req, res) => {
  try {
    const existingProject = await getProjectById(req.params.id);
    if (!existingProject) return res.status(404).json({ error: 'ไม่พบโครงการ' });

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'project', req.params.id, { project_name: existingProject.project_name });
    res.json({ message: 'ลบโครงการสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
