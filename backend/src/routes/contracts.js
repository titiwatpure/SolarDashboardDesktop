const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// Helper: ดึงสัญญาตาม id พร้อม join customer_name, project_name
const getContractById = async (id) => {
  const result = await pool.query(
    `SELECT ct.*,
       c.customer_name,
       p.project_name
     FROM contracts ct
     LEFT JOIN customers c ON ct.customer_id = c.id
     LEFT JOIN projects p ON ct.project_id = p.id
     WHERE ct.id = ?`,
    [id]
  );
  return result.rows[0] || null;
};

// GET /api/contracts — รายการสัญญา (filter: status, customer_id, project_id) + pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, customer_id, project_id } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    let clause = '';
    const params = [];

    if (status) {
      clause += ' AND ct.status = ?';
      params.push(status);
    }
    if (customer_id) {
      clause += ' AND ct.customer_id = ?';
      params.push(customer_id);
    }
    if (project_id) {
      clause += ' AND ct.project_id = ?';
      params.push(project_id);
    }

    const result = await pool.query(
      `SELECT ct.*,
         c.customer_name,
         p.project_name
       FROM contracts ct
       LEFT JOIN customers c ON ct.customer_id = c.id
       LEFT JOIN projects p ON ct.project_id = p.id
       WHERE 1=1${clause}
       ORDER BY ct.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM contracts ct WHERE 1=1${clause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/contracts/:id — ดึงสัญญาเดี่ยว
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contract = await getContractById(req.params.id);
    if (!contract) return res.status(404).json({ error: 'ไม่พบสัญญา' });
    res.json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/contracts — สร้างสัญญา
router.post('/', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const {
      project_id, customer_id, contract_number, status,
      start_date, end_date, total_value, signed_date, notes,
    } = req.body;

    if (!contract_number) {
      return res.status(400).json({ error: 'กรุณาระบุเลขที่สัญญา' });
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO contracts (id, project_id, customer_id, contract_number, status, start_date, end_date, total_value, signed_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        project_id || null,
        customer_id || null,
        contract_number,
        status || 'draft',
        start_date || null,
        end_date || null,
        total_value != null ? Number(total_value) : null,
        signed_date || null,
        notes || null,
      ]
    );

    const contract = await getContractById(id);
    logActivity(req.user.id, 'create', 'contract', id, { contract_number });
    res.status(201).json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/contracts/:id — แก้ไขสัญญา
router.put('/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getContractById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบสัญญา' });

    const fields = [
      'project_id', 'customer_id', 'contract_number', 'status',
      'start_date', 'end_date', 'total_value', 'signed_date', 'notes',
    ];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'total_value' && value !== null && value !== '') {
          value = Number(value);
        }
        setClauses.push(`${field} = ?`);
        values.push(value === '' ? null : value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`UPDATE contracts SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const contract = await getContractById(id);
    logActivity(req.user.id, 'update', 'contract', id, { fields: Object.keys(req.body) });
    res.json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/contracts/:id — ลบสัญญา
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const existing = await getContractById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบสัญญา' });

    await pool.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'contract', req.params.id, { contract_number: existing.contract_number });
    res.json({ message: 'ลบสัญญาสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
