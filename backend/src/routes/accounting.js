const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// CATEGORIES
// ============================================================

// GET /categories — รายการหมวดหมู่ (filter: type)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM accounting_categories WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sort_order ASC, name ASC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /categories — สร้างหมวดหมู่ (admin only)
router.post('/categories', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, type, icon, sort_order } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อและประเภทหมวดหมู่' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO accounting_categories (id, name, type, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, type, icon || null, sort_order != null ? Number(sort_order) : 0]
    );

    const result = await pool.query('SELECT * FROM accounting_categories WHERE id = ?', [id]);
    logActivity(req.user.id, 'create', 'accounting_category', id, { name, type });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// TRANSACTIONS
// ============================================================

// Helper: ดึง transaction ตาม id พร้อม join category_name, project_name
const getTransactionById = async (id) => {
  const result = await pool.query(
    `SELECT t.*,
       ac.name AS category_name,
       p.project_name
     FROM transactions t
     LEFT JOIN accounting_categories ac ON t.category_id = ac.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [id]
  );
  return result.rows[0] || null;
};

// GET /transactions — รายการธุรกรรม (filter + pagination)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { project_id, type, category_id, date_from, date_to } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    let clause = '';
    const params = [];

    if (project_id) {
      clause += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (type) {
      clause += ' AND t.type = ?';
      params.push(type);
    }
    if (category_id) {
      clause += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (date_from) {
      clause += ' AND t.transaction_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      clause += ' AND t.transaction_date <= ?';
      params.push(date_to);
    }

    const result = await pool.query(
      `SELECT t.*,
         ac.name AS category_name,
         p.project_name
       FROM transactions t
       LEFT JOIN accounting_categories ac ON t.category_id = ac.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE 1=1${clause}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM transactions t WHERE 1=1${clause}`,
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

// GET /transactions/:id — ดึงธุรกรรมเดี่ยว
router.get('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await getTransactionById(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'ไม่พบธุรกรรม' });
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /transactions — สร้างธุรกรรม
router.post('/transactions', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const {
      project_id, category_id, type, amount, description,
      transaction_date, reference_type, reference_id,
      payment_method, receipt_number,
    } = req.body;

    if (!type || amount == null) {
      return res.status(400).json({ error: 'กรุณาระบุประเภทและจำนวนเงิน' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO transactions
         (id, project_id, category_id, type, amount, description,
          transaction_date, reference_type, reference_id,
          payment_method, receipt_number, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        project_id || null,
        category_id || null,
        type,
        Number(amount),
        description || null,
        transaction_date || null,
        reference_type || null,
        reference_id || null,
        payment_method || null,
        receipt_number || null,
        req.user.id,
        now,
        now,
      ]
    );

    const transaction = await getTransactionById(id);
    logActivity(req.user.id, 'create', 'transaction', id, { type, amount });
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /transactions/:id — แก้ไขธุรกรรม
router.put('/transactions/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getTransactionById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบธุรกรรม' });

    const fields = [
      'project_id', 'category_id', 'type', 'amount', 'description',
      'transaction_date', 'reference_type', 'reference_id',
      'payment_method', 'receipt_number',
    ];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'amount' && value !== null && value !== '') {
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

    await pool.query(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const transaction = await getTransactionById(id);
    logActivity(req.user.id, 'update', 'transaction', id, { fields: Object.keys(req.body) });
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /transactions/:id — ลบธุรกรรม
router.delete('/transactions/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const existing = await getTransactionById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบธุรกรรม' });

    await pool.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'transaction', req.params.id, { type: existing.type, amount: existing.amount });
    res.json({ message: 'ลบธุรกรรมสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PAYMENT INSTALLMENTS
// ============================================================

// Helper: ดึง installment ตาม id พร้อม join contract_number, project_name
const getInstallmentById = async (id) => {
  const result = await pool.query(
    `SELECT pi.*,
       ct.contract_number,
       p.project_name
     FROM payment_installments pi
     LEFT JOIN contracts ct ON pi.contract_id = ct.id
     LEFT JOIN projects p ON pi.project_id = p.id
     WHERE pi.id = ?`,
    [id]
  );
  return result.rows[0] || null;
};

// GET /installments — รายการงวดชำระ (filter: project_id, contract_id, status)
router.get('/installments', authenticateToken, async (req, res) => {
  try {
    const { project_id, contract_id, status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    let clause = '';
    const params = [];

    if (project_id) {
      clause += ' AND pi.project_id = ?';
      params.push(project_id);
    }
    if (contract_id) {
      clause += ' AND pi.contract_id = ?';
      params.push(contract_id);
    }
    if (status) {
      clause += ' AND pi.status = ?';
      params.push(status);
    }

    const result = await pool.query(
      `SELECT pi.*,
         ct.contract_number,
         p.project_name
       FROM payment_installments pi
       LEFT JOIN contracts ct ON pi.contract_id = ct.id
       LEFT JOIN projects p ON pi.project_id = p.id
       WHERE 1=1${clause}
       ORDER BY pi.due_date ASC, pi.installment_number ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM payment_installments pi WHERE 1=1${clause}`,
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

// POST /installments — สร้างงวดชำระ (contract_id optional)
router.post('/installments', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const {
      contract_id, project_id, installment_number,
      description, amount, due_date, notes,
    } = req.body;

    if (!project_id || amount == null) {
      return res.status(400).json({ error: 'กรุณาระบุโครงการและจำนวนเงิน' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // ถ้าไม่ระบุ installment_number ให้คำนวณอัตโนมัติ
    let instNum = installment_number;
    if (instNum == null || instNum === '') {
      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(installment_number), 0) + 1 AS next FROM payment_installments WHERE project_id = ?',
        [project_id]
      );
      instNum = Number(maxResult.rows[0]?.next || 1);
    }

    await pool.query(
      `INSERT INTO payment_installments
         (id, contract_id, project_id, installment_number, description,
          amount, due_date, status, paid_amount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [
        id,
        contract_id || null,
        project_id,
        Number(instNum),
        description || null,
        Number(amount),
        due_date || null,
        notes || null,
        now,
        now,
      ]
    );

    const installment = await getInstallmentById(id);
    logActivity(req.user.id, 'create', 'payment_installment', id, { contract_id, installment_number: instNum });
    res.status(201).json(installment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /installments/bulk — สร้างหลายงวดพร้อมกัน
router.post('/installments/bulk', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { contract_id, project_id, installments } = req.body;

    if (!project_id || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุโครงการและรายการงวดชำระ' });
    }

    // หา installment_number เริ่มต้น
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(installment_number), 0) AS max FROM payment_installments WHERE project_id = ?',
      [project_id]
    );
    let nextNum = Number(maxResult.rows[0]?.max || 0) + 1;

    const now = new Date().toISOString();
    const created = [];

    for (const inst of installments) {
      if (inst.amount == null || inst.amount <= 0) continue;
      const id = uuidv4();
      await pool.query(
        `INSERT INTO payment_installments
           (id, contract_id, project_id, installment_number, description,
            amount, due_date, status, paid_amount, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
        [
          id,
          contract_id || null,
          project_id,
          nextNum,
          inst.description || null,
          Number(inst.amount),
          inst.due_date || null,
          inst.notes || null,
          now,
          now,
        ]
      );
      created.push(await getInstallmentById(id));
      nextNum++;
    }

    logActivity(req.user.id, 'bulk_create', 'payment_installment', null, {
      project_id,
      count: created.length,
    });
    res.status(201).json({ data: created, count: created.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /installments/:id — แก้ไขงวดชำระ
router.put('/installments/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getInstallmentById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบงวดชำระ' });

    const fields = [
      'installment_number', 'description', 'amount', 'due_date',
      'status', 'paid_amount', 'paid_date', 'transaction_id', 'notes',
    ];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if ((field === 'amount' || field === 'paid_amount') && value !== null && value !== '') {
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

    await pool.query(`UPDATE payment_installments SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const installment = await getInstallmentById(id);
    logActivity(req.user.id, 'update', 'payment_installment', id, { fields: Object.keys(req.body) });
    res.json(installment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /installments/:id/pay — บันทึกการชำระเงิน
router.post('/installments/:id/pay', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, paid_date, payment_method } = req.body;

    if (paid_amount == null) {
      return res.status(400).json({ error: 'กรุณาระบุจำนวนเงินที่ชำระ' });
    }

    const existing = await getInstallmentById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบงวดชำระ' });

    const now = new Date().toISOString();
    const transactionId = uuidv4();

    // สร้างธุรกรรม income จากการชำระ
    await pool.query(
      `INSERT INTO transactions
         (id, project_id, category_id, type, amount, description,
          transaction_date, reference_type, reference_id,
          payment_method, receipt_number, created_by, created_at, updated_at)
       VALUES (?, ?, NULL, 'income', ?, ?, ?, 'installment', ?, ?, NULL, ?, ?, ?)`,
      [
        transactionId,
        existing.project_id,
        Number(paid_amount),
        `ชำระงวดที่ ${existing.installment_number} - ${existing.description || ''}`.trim(),
        paid_date || new Date().toISOString().slice(0, 10),
        id,
        payment_method || null,
        req.user.id,
        now,
        now,
      ]
    );

    // ตรวจสอบสถานะ: paid หรือ partial
    const totalPaid = Number(existing.paid_amount || 0) + Number(paid_amount);
    const newStatus = totalPaid >= Number(existing.amount) ? 'paid' : 'partial';

    // อัปเดต installment
    await pool.query(
      `UPDATE payment_installments
       SET paid_amount = ?, paid_date = ?, status = ?,
           transaction_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        totalPaid,
        paid_date || new Date().toISOString().slice(0, 10),
        newStatus,
        transactionId,
        now,
        id,
      ]
    );

    // ตรวจสอบว่าทุกงวดของสัญญาจ่ายครบหรือยัง → อัปเดตสถานะสัญญา
    const unpaidResult = await pool.query(
      `SELECT COUNT(*) as count FROM payment_installments
       WHERE contract_id = ? AND status NOT IN ('paid')`,
      [existing.contract_id]
    );
    const unpaidCount = parseInt(unpaidResult.rows[0]?.count || '0', 10);

    if (unpaidCount === 0) {
      await pool.query(
        `UPDATE contracts SET status = 'completed', updated_at = ? WHERE id = ?`,
        [now, existing.contract_id]
      );
      logActivity(req.user.id, 'update', 'contract', existing.contract_id, {
        status: 'completed',
        reason: 'installments_all_paid',
      });
    }

    const installment = await getInstallmentById(id);
    logActivity(req.user.id, 'pay', 'payment_installment', id, {
      paid_amount: Number(paid_amount),
      transaction_id: transactionId,
    });
    res.json(installment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /installments/:id — ลบงวดชำระ (บังคับลบ transaction ก่อนถ้ามี)
router.delete('/installments/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const existing = await getInstallmentById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบงวดชำระ' });

    // ถ้างวดชำระมี transaction เชื่อมอยู่ ต้องลบ transaction ก่อน
    if (existing.transaction_id) {
      const txExists = await pool.query('SELECT id FROM transactions WHERE id = ?', [existing.transaction_id]);
      if (txExists.rows.length > 0) {
        return res.status(400).json({
          error: 'งวดชำระนี้มีรายการบัญชีเชื่อมอยู่ กรุณาลบรายการบัญชีก่อน',
          transaction_id: existing.transaction_id,
        });
      }
    }

    await pool.query('DELETE FROM payment_installments WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'payment_installment', req.params.id, {
      contract_id: existing.contract_id,
      installment_number: existing.installment_number,
    });
    res.json({ message: 'ลบงวดชำระสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PROJECT FINANCIAL SUMMARY
// ============================================================

// GET /project/:projectId/summary — สรุปการเงินของโครงการ
router.get('/project/:projectId/summary', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // ดึง budget จาก projects
    const projectResult = await pool.query('SELECT budget FROM projects WHERE id = ?', [projectId]);
    const budget = projectResult.rows[0]?.budget || 0;

    // สรุปรายรับ-รายจ่ายจาก transactions
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE project_id = ? AND type = 'income'`,
      [projectId]
    );
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE project_id = ? AND type = 'expense'`,
      [projectId]
    );

    const totalIncome = Number(incomeResult.rows[0]?.total || 0);
    const totalExpense = Number(expenseResult.rows[0]?.total || 0);
    const profit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    // สรุปงวดชำระ
    const installmentsResult = await pool.query(
      `SELECT
         COUNT(*) as total_count,
         COALESCE(SUM(amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paid_count,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_amount ELSE 0 END), 0) as paid_amount,
         COALESCE(SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END), 0) as partial_count,
         COALESCE(SUM(CASE WHEN status = 'partial' THEN paid_amount ELSE 0 END), 0) as partial_paid_amount,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
       FROM payment_installments WHERE project_id = ?`,
      [projectId]
    );

    const inst = installmentsResult.rows[0];

    // สรุปตามหมวดหมู่
    const categoryResult = await pool.query(
      `SELECT
         t.type,
         ac.name AS category_name,
         COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       LEFT JOIN accounting_categories ac ON t.category_id = ac.id
       WHERE t.project_id = ?
       GROUP BY t.category_id, t.type
       ORDER BY t.type, total DESC`,
      [projectId]
    );

    // รายการ transactions ทั้งหมดของโครงการ
    const transactionsResult = await pool.query(
      `SELECT t.*, ac.name AS category_name, p.project_name
       FROM transactions t
       LEFT JOIN accounting_categories ac ON t.category_id = ac.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.project_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [projectId]
    );

    res.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      profit,
      profit_margin: Math.round(profitMargin * 100) / 100,
      budget: Number(budget),
      budget_used: totalExpense,
      installments_total: Number(inst.total_count),
      installments_paid: Number(inst.paid_count),
      installments_partial: Number(inst.partial_count),
      installments_pending: Number(inst.pending_count),
      installments_total_amount: Number(inst.total_amount),
      installments_paid_amount: Number(inst.paid_amount),
      installments_partial_paid_amount: Number(inst.partial_paid_amount),
      installments_pending_amount: Number(inst.pending_amount),
      category_breakdown: categoryResult.rows,
      transactions: transactionsResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// COMPANY-WIDE SUMMARY
// ============================================================

// GET /company/summary — สรุปการเงินทั้งบริษัท
router.get('/company/summary', authenticateToken, async (req, res) => {
  try {
    // สรุปรายรับ-รายจ่ายรวม
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`
    );
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`
    );

    const totalIncome = Number(incomeResult.rows[0]?.total || 0);
    const totalExpense = Number(expenseResult.rows[0]?.total || 0);
    const totalProfit = totalIncome - totalExpense;

    // แนวโน้มรายเดือน (12 เดือนล่าสุด)
    const monthlyResult = await pool.query(
      `SELECT
         strftime('%Y-%m', transaction_date) AS month,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE transaction_date IS NOT NULL
         AND transaction_date >= date('now', '-12 months')
       GROUP BY strftime('%Y-%m', transaction_date)
       ORDER BY month ASC`
    );

    // โครงการที่ทำกำไรมากที่สุด 5 อันดับ
    const topProjectsResult = await pool.query(
      `SELECT
         t.project_id,
         p.project_name,
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS profit
       FROM transactions t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.project_id IS NOT NULL
       GROUP BY t.project_id
       ORDER BY profit DESC
       LIMIT 5`
    );

    // ลูกหนี้คงค้าง (งวดที่ยังไม่ชำระ)
    const receivableResult = await pool.query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) as total
       FROM payment_installments
       WHERE status IN ('pending', 'overdue')`
    );

    // สรุปตามหมวดหมู่ (ทั้งบริษัท)
    const categoryResult = await pool.query(
      `SELECT
         t.type,
         ac.name AS category_name,
         COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       LEFT JOIN accounting_categories ac ON t.category_id = ac.id
       GROUP BY t.category_id, t.type
       ORDER BY t.type, total DESC`
    );

    res.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      total_profit: totalProfit,
      monthly_trend: monthlyResult.rows.map((r) => ({
        month: r.month,
        income: Number(r.income),
        expense: Number(r.expense),
      })),
      top_projects: topProjectsResult.rows.map((r) => ({
        project_id: r.project_id,
        project_name: r.project_name,
        income: Number(r.income),
        expense: Number(r.expense),
        profit: Number(r.profit),
      })),
      total_receivable: Number(receivableResult.rows[0]?.total || 0),
      category_breakdown: categoryResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
