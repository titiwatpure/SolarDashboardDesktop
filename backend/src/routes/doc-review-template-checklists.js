/**
 * Document Review Template Checklists API
 * จัดการ Template Checklist สำหรับเอกสารยื่นขออนุญาต
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// ============================================================
// GET /api/doc-review/template-checklists/agencies - รายชื่อหน่วยงานที่มี template
// ============================================================
router.get('/agencies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT agency FROM document_checklists WHERE is_template = 1 AND agency IS NOT NULL ORDER BY agency`
    );
    res.json(result.rows.map(r => r.agency));
  } catch (error) {
    console.error('[DOC_REVIEW_AGENCIES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/template-checklists/permit-types - ประเภทใบอนุญาตที่มี template
// ============================================================
router.get('/permit-types', authenticateToken, async (req, res) => {
  try {
    const { agency } = req.query;
    let query = `SELECT DISTINCT permit_type, name FROM document_checklists WHERE is_template = 1`;
    const params = [];
    if (agency) {
      query += ' AND agency = ?';
      params.push(agency);
    }
    query += ' ORDER BY permit_type';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_PERMIT_TYPES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/template-checklists - ดูรายการ Template ทั้งหมด
// ============================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, permit_type } = req.query;

    let query = `
      SELECT tc.*,
        (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = tc.id) as item_count
      FROM document_checklists tc
      WHERE tc.is_template = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (tc.name LIKE ? OR tc.document_type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (permit_type) {
      query += ' AND tc.permit_type = ?';
      params.push(permit_type);
    }

    query += ' ORDER BY tc.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/template-checklists/:id - ดูรายละเอียด Template
// ============================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM document_checklists WHERE id = ? AND is_template = 1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Template' });
    }

    const template = result.rows[0];

    // ดึง items ของ template
    const items = await pool.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [req.params.id]
    );

    res.json({
      ...template,
      items: items.rows
    });
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/template-checklists - สร้าง Template ใหม่
// ============================================================
router.post('/', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { name, permit_type, document_type, agency, source, items } = req.body;

    if (!name || !permit_type || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'กรุณาระบุข้อมูลให้ครบถ้วน (name, permit_type, items)' });
    }

    const id = uuidv4();

    const createdItems = await pool.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO document_checklists (id, name, permit_type, document_type, agency, source, is_template, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, name, permit_type, document_type || null, agency || null, source || null, req.user.id]
      );

      const itemIds = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = uuidv4();
        await tx.query(
          `INSERT INTO checklist_items (id, checklist_id, item_order, title, description, is_required)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, id, i + 1, item.title, item.description || null, item.is_required ? 1 : 0]
        );
        itemIds.push(itemId);
      }
      return itemIds;
    });

    logActivity(req.user.id, 'create', 'document_checklist', id, { name, permit_type, item_count: createdItems.length });

    const template = await pool.query('SELECT * FROM document_checklists WHERE id = ?', [id]);
    res.status(201).json({ ...template.rows[0], items: items.map((item, i) => ({ id: createdItems[i], ...item })) });
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/doc-review/template-checklists/:id - แก้ไข Template
// ============================================================
router.put('/:id', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { name, permit_type, document_type, agency, source, items } = req.body;

    const existing = await pool.query('SELECT * FROM document_checklists WHERE id = ? AND is_template = 1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Template' });
    }

    // อัพเดทข้อมูล template
    const setClauses = [];
    const values = [];

    if (name !== undefined) { setClauses.push('name = ?'); values.push(name); }
    if (permit_type !== undefined) { setClauses.push('permit_type = ?'); values.push(permit_type); }
    if (document_type !== undefined) { setClauses.push('document_type = ?'); values.push(document_type); }
    if (agency !== undefined) { setClauses.push('agency = ?'); values.push(agency); }
    if (source !== undefined) { setClauses.push('source = ?'); values.push(source); }

    await pool.transaction(async (tx) => {
      if (setClauses.length > 0) {
        setClauses.push('updated_at = datetime("now")');
        values.push(req.params.id);
        await tx.query(`UPDATE document_checklists SET ${setClauses.join(', ')} WHERE id = ?`, values);
      }

      // อัพเดท items ถ้ามีการส่งมา
      if (items && Array.isArray(items)) {
        await tx.query('DELETE FROM checklist_items WHERE checklist_id = ?', [req.params.id]);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemId = uuidv4();
          await tx.query(
            `INSERT INTO checklist_items (id, checklist_id, item_order, title, description, is_required)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [itemId, req.params.id, i + 1, item.title, item.description || null, item.is_required ? 1 : 0]
          );
        }
      }
    });

    logActivity(req.user.id, 'update', 'document_checklist', req.params.id, { name: name || existing.rows[0].name });

    const template = await pool.query('SELECT * FROM document_checklists WHERE id = ?', [req.params.id]);
    const updatedItems = await pool.query('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order', [req.params.id]);

    res.json({ ...template.rows[0], items: updatedItems.rows });
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// DELETE /api/doc-review/template-checklists/:id - ลบ Template
// ============================================================
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM document_checklists WHERE id = ? AND is_template = 1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Template' });
    }

    // ลบ items ก่อน แล้วลบ template
    await pool.transaction(async (tx) => {
      await tx.query('DELETE FROM checklist_items WHERE checklist_id = ?', [req.params.id]);
      await tx.query('DELETE FROM document_checklists WHERE id = ?', [req.params.id]);
    });

    logActivity(req.user.id, 'delete', 'document_checklist', req.params.id, { name: existing.rows[0].name });

    res.json({ message: 'ลบ Template สำเร็จ' });
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/doc-review/template-checklists/:id/copy - คัดลอก Template
// ============================================================
router.post('/:id/copy', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM document_checklists WHERE id = ? AND is_template = 1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Template' });
    }

    const template = existing.rows[0];
    const newId = uuidv4();
    const newName = req.body.name || `${template.name} (สำเนา)`;

    // คัดลอก items
    const sourceItems = await pool.query('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order', [req.params.id]);

    await pool.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO document_checklists (id, name, permit_type, document_type, agency, source, is_template, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [newId, newName, template.permit_type, template.document_type, template.agency, template.source, req.user.id]
      );

      for (let i = 0; i < sourceItems.rows.length; i++) {
        const item = sourceItems.rows[i];
        const itemId = uuidv4();
        await tx.query(
          `INSERT INTO checklist_items (id, checklist_id, item_order, title, description, is_required)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, newId, i + 1, item.title, item.description, item.is_required]
        );
      }
    });

    logActivity(req.user.id, 'create', 'document_checklist', newId, { name: newName, copied_from: req.params.id });

    const newTemplate = await pool.query('SELECT * FROM document_checklists WHERE id = ?', [newId]);
    const newItems = await pool.query('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order', [newId]);

    res.status(201).json({ ...newTemplate.rows[0], items: newItems.rows });
  } catch (error) {
    console.error('[DOC_REVIEW_TEMPLATE_CHECKLISTS]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
