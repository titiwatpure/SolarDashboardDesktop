const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizePermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const VALID_ORG_TYPES = ['erc', 'pea', 'mea', 'tambon', 'municipal', 'factory', 'industrial'];
const VALID_CONTACT_ROLES = ['reception', 'engineer', 'approver', 'finance', 'other'];

const getOrganizationById = async (id) => {
  const result = await pool.query('SELECT * FROM organizations WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// ========================
// Static routes (BEFORE /:id)
// ========================

// GET /api/organizations/contacts/all — all contacts (paginated)
router.get('/contacts/all', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const { search, organization_id, org_type, status, is_primary } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (search) {
      whereClause += ' AND (c.full_name LIKE ? OR c.position LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (organization_id) { whereClause += ' AND c.organization_id = ?'; params.push(organization_id); }
    if (org_type) { whereClause += ' AND o.org_type = ?'; params.push(org_type); }
    if (status) { whereClause += ' AND c.status = ?'; params.push(status); }
    if (is_primary === '1') { whereClause += ' AND c.is_primary = 1'; }

    const result = await pool.query(`
      SELECT c.*, o.org_name, o.org_type
      FROM organization_contacts c
      JOIN organizations o ON c.organization_id = o.id
      ${whereClause}
      ORDER BY o.org_name, c.is_primary DESC, c.full_name
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM organization_contacts c JOIN organizations o ON c.organization_id = o.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({ data: result.rows, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/organizations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const result = await pool.query(`
      SELECT o.*, COUNT(po.id) as project_count
      FROM organizations o
      LEFT JOIN project_organizations po ON po.org_id = o.id
      GROUP BY o.id
      ORDER BY o.org_name
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    const countResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    res.json({ data: result.rows, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/organizations
router.post('/', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { org_name, org_type } = req.body;
    if (!org_name || !org_type) return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    if (!VALID_ORG_TYPES.includes(org_type)) return res.status(400).json({ error: 'ประเภทหน่วยงานไม่ถูกต้อง' });
    const duplicate = await pool.query('SELECT id FROM organizations WHERE org_name = ?', [org_name]);
    if (duplicate.rows.length > 0) return res.status(400).json({ error: 'ชื่อหน่วยงานมีอยู่แล้ว' });
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

// ========================
// Dynamic routes (/:id)
// ========================

// GET /api/organizations/:id/projects
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

// GET /api/organizations/:id/contacts
router.get('/:id/contacts', authenticateToken, async (req, res) => {
  try {
    const org = await getOrganizationById(req.params.id);
    if (!org) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    const result = await pool.query(
      'SELECT * FROM organization_contacts WHERE organization_id = ? ORDER BY is_primary DESC, full_name ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/organizations/:id/contacts
router.post('/:id/contacts', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const org = await getOrganizationById(req.params.id);
    if (!org) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    const { full_name, position, department, phone, email, line_id, contact_role, is_primary, notes } = req.body;
    if (!full_name) return res.status(400).json({ error: 'กรุณาระบุชื่อ-นามสกุล' });
    if (contact_role && !VALID_CONTACT_ROLES.includes(contact_role)) {
      return res.status(400).json({ error: 'ประเภทผู้ติดต่อไม่ถูกต้อง' });
    }
    const id = uuidv4();
    if (is_primary) {
      await pool.query('UPDATE organization_contacts SET is_primary = 0 WHERE organization_id = ?', [req.params.id]);
    }
    await pool.query(
      `INSERT INTO organization_contacts (id, organization_id, full_name, position, department, phone, email, line_id, contact_role, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, full_name, position || null, department || null, phone || null, email || null, line_id || null,
       contact_role || 'other', is_primary ? 1 : 0, notes || null]
    );
    const contact = await pool.query('SELECT * FROM organization_contacts WHERE id = ?', [id]);
    await logActivity(req.user.id, 'create', 'organization_contact', id, { full_name, organization_id: req.params.id });
    res.status(201).json(contact.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/organizations/:id/contacts/:contactId
router.put('/:id/contacts/:contactId', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { contactId } = req.params;
    const existing = await pool.query('SELECT * FROM organization_contacts WHERE id = ? AND organization_id = ?', [contactId, req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ติดต่อ' });
    const { full_name, position, department, phone, email, line_id, contact_role, is_primary, status, notes } = req.body;
    if (contact_role && !VALID_CONTACT_ROLES.includes(contact_role)) {
      return res.status(400).json({ error: 'ประเภทผู้ติดต่อไม่ถูกต้อง' });
    }
    if (is_primary) {
      await pool.query('UPDATE organization_contacts SET is_primary = 0 WHERE organization_id = ? AND id != ?', [req.params.id, contactId]);
    }
    const cur = existing.rows[0];
    await pool.query(
      `UPDATE organization_contacts SET
        full_name=?, position=?, department=?, phone=?, email=?, line_id=?, contact_role=?, is_primary=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=?`,
      [full_name??cur.full_name, position??cur.position, department??cur.department, phone??cur.phone, email??cur.email,
       line_id??cur.line_id, contact_role??cur.contact_role, is_primary!==undefined?(is_primary?1:0):cur.is_primary,
       status??cur.status, notes??cur.notes, contactId]
    );
    const updated = await pool.query('SELECT * FROM organization_contacts WHERE id = ?', [contactId]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/organizations/:id/contacts/:contactId
router.delete('/:id/contacts/:contactId', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { contactId } = req.params;
    const existing = await pool.query('SELECT * FROM organization_contacts WHERE id = ? AND organization_id = ?', [contactId, req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ติดต่อ' });
    await pool.query('DELETE FROM organization_contacts WHERE id = ?', [contactId]);
    await logActivity(req.user.id, 'delete', 'organization_contact', contactId, { full_name: existing.rows[0].full_name });
    res.json({ message: 'ลบผู้ติดต่อสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/organizations/:id
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

// PUT /api/organizations/:id
router.put('/:id', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const { org_name, org_type } = req.body;
    const { id } = req.params;
    const existing = await getOrganizationById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    if (org_type && !VALID_ORG_TYPES.includes(org_type)) return res.status(400).json({ error: 'ประเภทหน่วยงานไม่ถูกต้อง' });
    if (org_name && org_name !== existing.org_name) {
      const duplicate = await pool.query('SELECT id FROM organizations WHERE org_name = ? AND id != ?', [org_name, id]);
      if (duplicate.rows.length > 0) return res.status(400).json({ error: 'ชื่อหน่วยงานมีอยู่แล้ว' });
    }
    await pool.query('UPDATE organizations SET org_name = ?, org_type = ? WHERE id = ?',
      [org_name ?? existing.org_name, org_type ?? existing.org_type, id]);
    const organization = await getOrganizationById(id);
    await logActivity(req.user.id, 'update', 'organization', id, { org_name, org_type });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/organizations/:id
router.delete('/:id', authenticateToken, authorizePermission('approval.manage'), async (req, res) => {
  try {
    const existing = await getOrganizationById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบหน่วยงาน' });
    await pool.query('DELETE FROM organizations WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete', 'organization', req.params.id, { org_name: existing.org_name });
    res.json({ message: 'ลบหน่วยงานสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
