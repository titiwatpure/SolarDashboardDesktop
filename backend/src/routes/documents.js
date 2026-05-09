const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const getDocumentById = async (id) => {
  const result = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/documents — ดึงเอกสารทั้งหมด (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT d.*, p.project_name, u.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.upload_by = u.id
       ORDER BY d.uploaded_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as count FROM documents');
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

// GET /api/documents/project/:project_id — ดึงเอกสารตามโครงการ
router.get('/project/:project_id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, p.project_name, u.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.upload_by = u.id
       WHERE d.project_id = ?
       ORDER BY d.uploaded_at DESC`,
      [req.params.project_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/documents — เพิ่มเอกสารใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, document_name, document_type, file_path, file_size, description } = req.body;

    if (!project_id || !document_name || !document_type) {
      return res.status(400).json({ error: 'ข้อมูลเอกสารไม่ครบถ้วน' });
    }

    const validDocTypes = ['sld', 'permit', 'test_report', 'other'];
    if (!validDocTypes.includes(document_type)) {
      return res.status(400).json({ error: 'ประเภทเอกสารไม่ถูกต้อง' });
    }

    // M-10: ตรวจสอบว่า project_id มีอยู่จริง
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO documents (id, project_id, document_name, document_type, file_path, file_size, upload_by, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, document_name, document_type, file_path || null, file_size ? Number(file_size) : null, req.user.id, description || null]
    );

    const document = await getDocumentById(id);
    logActivity(req.user.id, 'create', 'document', id, { document_name, project_id });
    res.status(201).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/documents/:id — ลบเอกสาร (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existingDocument = await getDocumentById(req.params.id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'ไม่พบเอกสาร' });
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'document', req.params.id, { document_name: existingDocument.document_name });
    res.json({ message: 'ลบเอกสารสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
