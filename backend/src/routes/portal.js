const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ---------- helper: ดึง customerId จาก user_id ----------
async function getCustomerId(userId) {
  const result = await pool.query(
    'SELECT id FROM customers WHERE user_id = ?',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ---------- middleware: แนบ customerId กับทุก route ----------
router.use(authenticateToken, async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    if (!customerId) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลลูกค้าที่เชื่อมกับผู้ใช้นี้' });
    }
    req.customerId = customerId;
    next();
  } catch (error) {
    console.error('Portal middleware error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /summary — สรุปภาพรวมแดชบอร์ดลูกค้า
// ============================================================
router.get('/summary', async (req, res) => {
  try {
    const customerId = req.customerId;

    // นับจำนวนโปรเจกต์แยกตามสถานะ
    const projectsResult = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM projects
       WHERE customer_id = ?
       GROUP BY status`,
      [customerId]
    );

    // นับจำนวนใบเสนอราคาแยกตามสถานะ
    const quotationsResult = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM quotations
       WHERE customer_id = ?
       GROUP BY status`,
      [customerId]
    );

    // นับจำนวนสัญญาแยกตามสถานะ
    const contractsResult = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM contracts
       WHERE customer_id = ?
       GROUP BY status`,
      [customerId]
    );

    // แปลง rows เป็น { status: count }
    const toByStatus = (rows) => {
      const obj = {};
      for (const row of rows) {
        obj[row.status] = row.count;
      }
      return obj;
    };

    const projectRows = projectsResult.rows;
    const quotationRows = quotationsResult.rows;
    const contractRows = contractsResult.rows;

    res.json({
      projects: {
        total: projectRows.reduce((sum, r) => sum + r.count, 0),
        by_status: toByStatus(projectRows),
      },
      quotations: {
        total: quotationRows.reduce((sum, r) => sum + r.count, 0),
        by_status: toByStatus(quotationRows),
      },
      contracts: {
        total: contractRows.reduce((sum, r) => sum + r.count, 0),
        by_status: toByStatus(contractRows),
      },
    });
  } catch (error) {
    console.error('Portal /summary error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /projects — รายการโปรเจกต์ของลูกค้า
// ============================================================
router.get('/projects', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, project_name, project_code, status, current_step,
              size_kw, province, risk_level, created_at
       FROM projects
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [req.customerId]
    );

    // คำนวณ progress จาก current_step / status
    const STEP_ORDER = {
      survey: 0, design: 1, erc: 2, grid: 3,
      construction: 4, testing: 5, cod: 6,
    };

    const rows = result.rows.map((row) => {
      let progress = 0;
      if (row.status === 'completed') {
        progress = 100;
      } else {
        const current = STEP_ORDER[row.current_step] ?? 0;
        progress = Math.round((current / 6) * 100);
      }
      return { ...row, progress };
    });

    res.json(rows);
  } catch (error) {
    console.error('Portal /projects error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /quotations — รายการใบเสนอราคาของลูกค้า
// ============================================================
router.get('/quotations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, quote_number, status, total_amount, valid_until, created_at
       FROM quotations
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [req.customerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Portal /quotations error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /contracts — รายการสัญญาของลูกค้า (join กับ projects)
// ============================================================
router.get('/contracts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.id, ct.contract_number, ct.status, ct.total_value,
              ct.start_date, ct.end_date, ct.signed_date,
              p.project_name
       FROM contracts ct
       LEFT JOIN projects p ON p.id = ct.project_id
       WHERE ct.customer_id = ?
       ORDER BY ct.created_at DESC`,
      [req.customerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Portal /contracts error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /documents — เอกสารจากทุกโปรเจกต์ของลูกค้า
// ============================================================
router.get('/documents', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.document_name, d.document_type, d.file_size,
              d.uploaded_at, p.project_name
       FROM documents d
       INNER JOIN projects p ON p.id = d.project_id
       WHERE p.customer_id = ?
       ORDER BY d.uploaded_at DESC`,
      [req.customerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Portal /documents error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
