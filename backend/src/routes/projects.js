const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { createNotification } = require('./notifications');

const router = express.Router();

const getProjectById = async (id) => {
  const result = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/projects/stats/kpis — ดึงตัวเลข KPI
router.get('/stats/kpis', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(CASE WHEN permit_type = 'exemption' THEN 1 END) as exemption,
        COUNT(CASE WHEN permit_type = 'permit' THEN 1 END) as permit,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked
      FROM projects
    `);

    res.json(result.rows[0] || {
      total_projects: 0,
      exemption: 0,
      permit: 0,
      completed: 0,
      blocked: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ฟังก์ชันช่วย: สร้าง WHERE clause จากตัวกรอง (ใช้ ? สำหรับ SQLite)
const buildFilter = (filters) => {
  const { province, status, current_step, search } = filters;
  let clause = '';
  const params = [];

  if (province) {
    clause += ' AND province = ?';
    params.push(province);
  }

  if (status) {
    clause += ' AND status = ?';
    params.push(status);
  }

  if (current_step) {
    clause += ' AND current_step = ?';
    params.push(current_step);
  }

  if (search) {
    clause += ' AND (project_name LIKE ? OR project_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  return { clause, params };
};

// GET /api/projects — ดึงรายชื่อโครงการ พร้อม filter + pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { province, status, current_step, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filters = { province, status, current_step, search };
    const { clause, params } = buildFilter(filters);

    // ดึงข้อมูล + pagination (JOIN ดึงชื่อผู้รับผิดชอบ + หน่วยงาน)
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

    // นับจำนวนทั้งหมด
    const countQuery = `SELECT COUNT(*) as count FROM projects WHERE 1=1${clause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id/organizations — ดึงหน่วยงานของโครงการ
router.get('/:id/organizations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.org_name, o.org_type
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

// POST /api/projects/:id/organizations — เพิ่มหน่วยงานให้โครงการ (Admin only)
router.post('/:id/organizations', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { org_id } = req.body;
    if (!org_id) {
      return res.status(400).json({ error: 'กรุณาระบุ org_id' });
    }

    // #8: ตรวจสอบว่า project มีอยู่
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [req.params.id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    // #8: ตรวจสอบว่า organization มีอยู่
    const orgCheck = await pool.query('SELECT id FROM organizations WHERE id = ?', [org_id]);
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    }

    // เช็คว่ามีอยู่แล้วหรือไม่
    const existing = await pool.query(
      'SELECT id FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [req.params.id, org_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'หน่วยงานนี้เชื่อมกับโครงการแล้ว' });
    }

    await pool.query(
      'INSERT INTO project_organizations (id, project_id, org_id) VALUES (?, ?, ?)',
      [uuidv4(), req.params.id, org_id]
    );
    res.status(201).json({ message: 'เชื่อมหน่วยงานสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/projects/:id/organizations/:orgId — ลบหน่วยงานจากโครงการ (Admin only)
router.delete('/:id/organizations/:orgId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM project_organizations WHERE project_id = ? AND org_id = ?',
      [req.params.id, req.params.orgId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'ไม่พบการเชื่อมต่อ' });
    }
    res.json({ message: 'ลบการเชื่อมต่อสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id — ดึงรายละเอียดโครงการ (JOIN ชื่อผู้รับผิดชอบ)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.full_name as responsible_user_name
       FROM projects p
       LEFT JOIN users u ON p.responsible_user = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/projects — สร้างโครงการใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      project_name, project_code, size_kw, size_kva, province,
      responsible_user, description, has_power_selling, start_date
    } = req.body;

    if (!project_name || !project_code || !size_kw || !province) {
      return res.status(400).json({ error: 'ข้อมูลโครงการไม่ครบถ้วน' });
    }

    // #13: ตรวจสอบ size_kw เป็นตัวเลข
    const sizeKwNum = Number(size_kw);
    if (isNaN(sizeKwNum) || sizeKwNum < 0) {
      return res.status(400).json({ error: 'ขนาด kW ต้องเป็นตัวเลข' });
    }

    // #13: ตรวจสอบ size_kva เป็นตัวเลข (ถ้ามี)
    if (size_kva !== undefined && size_kva !== null && size_kva !== '') {
      const sizeKvaNum = Number(size_kva);
      if (isNaN(sizeKvaNum) || sizeKvaNum < 0) {
        return res.status(400).json({ error: 'ขนาด kVA ต้องเป็นตัวเลข' });
      }
    }

    // #11: ตรวจสอบ responsible_user มีอยู่จริง
    if (responsible_user) {
      const userCheck = await pool.query('SELECT id FROM users WHERE id = ?', [responsible_user]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ error: 'ไม่พบผู้รับผิดชอบ' });
      }
    }

    const duplicate = await pool.query(
      'SELECT id FROM projects WHERE project_code = ?',
      [project_code]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: 'รหัสโครงการมีอยู่แล้ว' });
    }

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
        permit_type, start_date, status, current_step
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, project_name, project_code, Number(size_kw),
        size_kva ? Number(size_kva) : null, province,
        responsible_user || null, description || null,
        has_power_selling ? 1 : 0, requiresPermit ? 1 : 0,
        permitType, start_date || null, 'pending', 'survey'
      ]
    );

    const project = await getProjectById(id);
    logActivity(req.user.id, 'create', 'project', id, { project_name, project_code });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/projects/:id/timeline — ดึงประวัติ timeline ของโครงการ
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

// DELETE /api/projects/:id/timeline/:timelineId — ลบ timeline entry (Admin only)
router.delete('/:id/timeline/:timelineId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id, timelineId } = req.params;

    const existing = await pool.query(
      'SELECT id FROM project_timeline WHERE id = ? AND project_id = ?',
      [timelineId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการ timeline' });
    }

    await pool.query('DELETE FROM project_timeline WHERE id = ?', [timelineId]);
    res.json({ message: 'ลบรายการ timeline สำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/projects/:id — อัปเดตโครงการ
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = [
      'project_name', 'province', 'status', 'current_step',
      'responsible_user', 'description', 'has_power_selling',
      'blocked_reason', 'actual_cod_date', 'expected_cod_date',
      'size_kw', 'size_kva', 'start_date'
    ];

    // ดึงข้อมูลเดิมก่อนอัปเดต (สำหรับเช็ค step/status เปลี่ยน)
    const existing = await getProjectById(id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const setClauses = [];
    const values = [];

    for (const [key, rawValue] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      let value = rawValue;
      if (key === 'has_power_selling') value = rawValue ? 1 : 0;
      if ((key === 'size_kw' || key === 'size_kva') && rawValue !== '' && rawValue != null) {
        value = Number(rawValue);
        // #13: ป้องกัน NaN
        if (isNaN(value)) {
          return res.status(400).json({ error: `${key} ต้องเป็นตัวเลข` });
        }
      }

      setClauses.push(`${key} = ?`);
      values.push(value === '' ? null : value);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`;
    await pool.query(query, values);

    // ตรวจจับ step หรือ status เปลี่ยน → บันทึก timeline อัตโนมัติ
    const newStep = updates.current_step || existing.current_step;
    const newStatus = updates.status || existing.status;
    const stepChanged = updates.current_step && updates.current_step !== existing.current_step;
    const statusChanged = updates.status && updates.status !== existing.status;

    if (stepChanged || statusChanged) {
  
      await pool.query(
        `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), id, newStep, newStatus,
          updates.blocked_reason || null,
          req.user.id
        ]
      );
    }

    // ดึง project พร้อมชื่อผู้รับผิดชอบ
    const result = await pool.query(
      `SELECT p.*, u.full_name as responsible_user_name
       FROM projects p
       LEFT JOIN users u ON p.responsible_user = u.id
       WHERE p.id = ?`,
      [id]
    );
    logActivity(req.user.id, 'update', 'project', id, { fields: Object.keys(updates) });

    // แจ้งเตือนเมื่อสถานะโครงการเปลี่ยน
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

// DELETE /api/projects/:id — ลบโครงการ (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existingProject = await getProjectById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'project', req.params.id, { project_name: existingProject.project_name });
    res.json({ message: 'ลบโครงการสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
