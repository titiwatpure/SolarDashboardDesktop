const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizePermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const VALID_ORG_TYPES = ['erc', 'pea', 'mea', 'tambon', 'municipal', 'factory', 'industrial'];

const getOrganizationById = async (id) => {
  const result = await pool.query('SELECT * FROM organizations WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/organizations — ดึงหน่วยงานทั้งหมด (พร้อมจำนวนโครงการ)
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, COUNT(po.id) as project_count
      FROM organizations o
      LEFT JOIN project_organizations po ON po.org_id = o.id
      GROUP BY o.id
      ORDER BY o.org_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/organizations/:id/projects — ดึงโครงการที่เกี่ยวข้อง
router.get('/:id/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, p.project_name, p.current_step, p.status as project_status
       FROM project_organizations po
       JOIN projects p ON po.project_id = p.id
       WHERE po.org_id = ?
       ORDER BY po.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/organizations/:id — ดึงหน่วยงานเดี่ยว
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const org = await getOrganizationById(req.params.id);
    if (!org) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    res.json(org);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/organizations — สร้างหน่วยงานใหม่ (Admin only)
router.post('/', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { org_name, org_type } = req.body;

    if (!org_name || !org_type) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (!VALID_ORG_TYPES.includes(org_type)) {
      return res.status(400).json({ error: 'ประเภทหน่วยงานไม่ถูกต้อง' });
    }

    const duplicate = await pool.query('SELECT id FROM organizations WHERE org_name = ?', [org_name]);
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: 'ชื่อหน่วยงานมีอยู่แล้ว' });
    }

    const id = uuidv4();
    await pool.query('INSERT INTO organizations (id, org_name, org_type) VALUES (?, ?, ?)', [id, org_name, org_type]);

    const organization = await getOrganizationById(id);
    await logActivity(req.user.id, 'create', 'organization', id, { org_name, org_type });
    res.status(201).json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/organizations/:id — แก้ไขหน่วยงาน (Admin only)
router.put('/:id', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { org_name, org_type } = req.body;
    const { id } = req.params;

    const existing = await getOrganizationById(id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    }

    if (org_type && !VALID_ORG_TYPES.includes(org_type)) {
      return res.status(400).json({ error: 'ประเภทหน่วยงานไม่ถูกต้อง' });
    }

    if (org_name && org_name !== existing.org_name) {
      const duplicate = await pool.query('SELECT id FROM organizations WHERE org_name = ? AND id != ?', [org_name, id]);
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ error: 'ชื่อหน่วยงานมีอยู่แล้ว' });
      }
    }

    await pool.query(
      'UPDATE organizations SET org_name = ?, org_type = ? WHERE id = ?',
      [org_name ?? existing.org_name, org_type ?? existing.org_type, id]
    );

    const organization = await getOrganizationById(id);
    await logActivity(req.user.id, 'update', 'organization', id, { org_name, org_type });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/organizations/:id — ลบหน่วยงาน (Admin only)
router.delete('/:id', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const existing = await getOrganizationById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    }

    // CASCADE delete จะลบ project_organizations อัตโนมัติ
    await pool.query('DELETE FROM organizations WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete', 'organization', req.params.id, { org_name: existing.org_name });
    res.json({ message: 'ลบหน่วยงานสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
