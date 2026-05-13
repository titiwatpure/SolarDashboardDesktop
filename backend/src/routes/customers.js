const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const getCustomerById = async (id) => {
  const result = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search || '';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

    let clause = '';
    const params = [];
    if (search) {
      clause = ' AND (customer_name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) as project_count
       FROM customers c
       LEFT JOIN projects p ON p.customer_id = c.id
       WHERE 1=1${clause}
       GROUP BY c.id
       ORDER BY c.customer_name
       LIMIT ?`,
      [...params, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'ไม่พบลูกค้า' });
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/customers/:id/projects
router.get('/:id/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, project_name, project_code, status, current_step, size_kw, province
       FROM projects WHERE customer_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_type, contact_name, contact_phone, contact_email, tax_id, address, notes } = req.body;
    if (!customer_name) return res.status(400).json({ error: 'กรุณาระบุชื่อลูกค้า' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO customers (id, customer_name, customer_type, contact_name, contact_phone, contact_email, tax_id, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customer_name, customer_type || null, contact_name || null, contact_phone || null, contact_email || null, tax_id || null, address || null, notes || null]
    );

    const customer = await getCustomerById(id);
    logActivity(req.user.id, 'create', 'customer', id, { customer_name });
    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getCustomerById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบลูกค้า' });

    const fields = ['customer_name', 'customer_type', 'contact_name', 'contact_phone', 'contact_email', 'tax_id', 'address', 'notes'];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(req.body[field] === '' ? null : req.body[field]);
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });

    values.push(id);
    await pool.query(`UPDATE customers SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const customer = await getCustomerById(id);
    logActivity(req.user.id, 'update', 'customer', id, { fields: Object.keys(req.body) });
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await getCustomerById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบลูกค้า' });

    // Unlink from projects first
    await pool.query('UPDATE projects SET customer_id = NULL WHERE customer_id = ?', [req.params.id]);
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);

    logActivity(req.user.id, 'delete', 'customer', req.params.id, { customer_name: existing.customer_name });
    res.json({ message: 'ลบลูกค้าสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
