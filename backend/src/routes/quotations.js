const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// Helper: ดึงใบเสนอราคาตาม id
const getQuotationById = async (id) => {
  const result = await pool.query(
    `SELECT q.*, c.customer_name
     FROM quotations q
     LEFT JOIN customers c ON q.customer_id = c.id
     WHERE q.id = ?`,
    [id]
  );
  return result.rows[0] || null;
};

// Helper: สร้างเลขที่ใบเสนอราคา QT-YYYY-NNNN
const generateQuoteNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  const result = await pool.query(
    `SELECT quote_number FROM quotations
     WHERE quote_number LIKE ?
     ORDER BY quote_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].quote_number;
    const lastSeq = parseInt(lastNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Valid status transitions
const STATUS_TRANSITIONS = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: ['expired'],
  rejected: ['expired'],
  expired: [],
};

// GET / — List quotations with filters and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    let clause = '';
    const params = [];

    if (status) {
      clause += ' AND q.status = ?';
      params.push(status);
    }
    if (customer_id) {
      clause += ' AND q.customer_id = ?';
      params.push(customer_id);
    }
    if (search) {
      clause += ' AND q.quote_number LIKE ?';
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT q.*, c.customer_name
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE 1=1${clause}
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM quotations q WHERE 1=1${clause}`,
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

// GET /:id — Get single quotation with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quotation = await getQuotationById(req.params.id);
    if (!quotation) return res.status(404).json({ error: 'ไม่พบใบเสนอราคา' });

    const itemsResult = await pool.query(
      `SELECT * FROM quotation_items
       WHERE quotation_id = ?
       ORDER BY sort_order ASC`,
      [req.params.id]
    );
    quotation.items = itemsResult.rows;

    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST / — Create quotation with items
router.post('/', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const {
      customer_id, project_id, valid_until,
      subtotal, tax_rate, tax_amount, total_amount,
      notes, items,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'กรุณาระบุลูกค้า' });
    }

    // Validate project_id if provided
    if (project_id) {
      const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [project_id]);
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'ไม่พบโครงการ' });
      }
    }

    const id = uuidv4();
    const quote_number = await generateQuoteNumber();

    await pool.query(
      `INSERT INTO quotations (
        id, customer_id, project_id, quote_number, status,
        valid_until, subtotal, tax_rate, tax_amount, total_amount,
        notes, created_by
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, customer_id || null, project_id || null, quote_number,
        valid_until || null,
        subtotal || 0, tax_rate || 7, tax_amount || 0, total_amount || 0,
        notes || null, req.user.id,
      ]
    );

    // Insert items
    if (Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pool.query(
          `INSERT INTO quotation_items (id, quotation_id, description, quantity, unit, unit_price, amount, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), id,
            item.description, item.quantity || 1, item.unit || 'ชุด',
            item.unit_price || 0, item.amount || 0, item.sort_order || i + 1,
          ]
        );
      }
    }

    const quotation = await getQuotationById(id);
    const itemsResult = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC',
      [id]
    );
    quotation.items = itemsResult.rows;

    logActivity(req.user.id, 'create', 'quotation', id, { quote_number, customer_id });
    res.status(201).json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /:id — Update quotation header fields only
router.put('/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getQuotationById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบใบเสนอราคา' });

    const allowedFields = [
      'customer_id', 'project_id', 'valid_until',
      'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
      'notes', 'status',
    ];

    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(req.body[field] === '' ? null : req.body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(
      `UPDATE quotations SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const quotation = await getQuotationById(id);
    logActivity(req.user.id, 'update', 'quotation', id, { fields: Object.keys(req.body) });
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /:id/items — Replace all items and recalculate subtotal
router.put('/:id/items', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getQuotationById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบใบเสนอราคา' });

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'กรุณาระบุรายการสินค้า' });
    }

    // Delete existing items
    await pool.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);

    // Insert new items
    let recalculatedSubtotal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const amount = item.amount || (item.quantity || 1) * (item.unit_price || 0);
      recalculatedSubtotal += amount;

      await pool.query(
        `INSERT INTO quotation_items (id, quotation_id, description, quantity, unit, unit_price, amount, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), id,
          item.description, item.quantity || 1, item.unit || 'ชุด',
          item.unit_price || 0, amount, item.sort_order || i + 1,
        ]
      );
    }

    // Recalculate subtotal and total
    const taxRate = existing.tax_rate || 7;
    const taxAmount = recalculatedSubtotal * (taxRate / 100);
    const totalAmount = recalculatedSubtotal + taxAmount;

    await pool.query(
      `UPDATE quotations SET subtotal = ?, tax_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?`,
      [recalculatedSubtotal, taxAmount, totalAmount, new Date().toISOString(), id]
    );

    const quotation = await getQuotationById(id);
    const itemsResult = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC',
      [id]
    );
    quotation.items = itemsResult.rows;

    logActivity(req.user.id, 'update', 'quotation_items', id, { item_count: items.length });
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /:id/status — Change quotation status
router.post('/:id/status', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'กรุณาระบุสถานะ' });
    }

    const existing = await getQuotationById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบใบเสนอราคา' });

    // Validate status transition
    const allowed = STATUS_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `ไม่สามารถเปลี่ยนสถานะจาก "${existing.status}" เป็น "${status}" ได้`,
        allowed_transitions: allowed,
      });
    }

    await pool.query(
      'UPDATE quotations SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );

    // On approve, log linked project
    if (status === 'approved' && existing.project_id) {
      logActivity(req.user.id, 'approve', 'quotation', id, {
        project_id: existing.project_id,
        quote_number: existing.quote_number,
      });
    }

    logActivity(req.user.id, 'status_change', 'quotation', id, {
      quote_number: existing.quote_number,
      from: existing.status,
      to: status,
    });

    const quotation = await getQuotationById(id);
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /:id — Delete quotation (only if draft)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const existing = await getQuotationById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบใบเสนอราคา' });

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'สามารถลบได้เฉพาะใบเสนอราคาที่มีสถานะ draft เท่านั้น' });
    }

    // Items are cascade deleted via FK constraint
    await pool.query('DELETE FROM quotations WHERE id = ?', [req.params.id]);

    logActivity(req.user.id, 'delete', 'quotation', req.params.id, {
      quote_number: existing.quote_number,
    });
    res.json({ message: 'ลบใบเสนอราคาสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
