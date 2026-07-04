/**
 * Document Review Files API
 * จัดการไฟล์เอกสารแต่ละ Version
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const defaultUploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

// Multer storage for document review files
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadsDir = defaultUploadsDir;
      const reviewDir = path.join(uploadsDir, 'doc-review');
      if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
      
      const projectDir = path.join(reviewDir, req.params.checklistId);
      if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
      
      cb(null, projectDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\s.]+$/g, '')
      .trim() || 'file';
    const uniqueId = uuidv4().substring(0, 8);
    cb(null, `${base}_${uniqueId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ประเภทไฟล์ไม่รองรับ'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ============================================================
// POST /api/doc-review/checklists/:checklistId/files - อัปโหลดไฟล์
// ============================================================
router.post('/checklists/:checklistId/files', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { received_from, received_channel, received_date, notes } = req.body;

    const checklistCheck = await pool.query('SELECT * FROM doc_review_checklists WHERE id = ?', [req.params.checklistId]);
    if (checklistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการเอกสาร' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์' });
    }

    // Get next version number
    const versionResult = await pool.query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM doc_review_files WHERE checklist_id = ?',
      [req.params.checklistId]
    );
    const nextVersion = versionResult.rows[0].next_version;

    const id = uuidv4();
    const filePath = path.relative(defaultUploadsDir, req.file.path).replace(/\\/g, '/');

    await pool.query(
      `INSERT INTO doc_review_files (id, checklist_id, version, file_name, file_path, file_size, received_from, received_channel, received_date, uploaded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.checklistId, nextVersion, req.file.originalname, filePath, req.file.size,
       received_from || null, received_channel || null, received_date || null, req.user.id, notes || null]
    );

    // Update checklist latest_version and status
    await pool.query(
      `UPDATE doc_review_checklists SET latest_version = ?, status = 'checking', updated_at = datetime("now") WHERE id = ?`,
      [nextVersion, req.params.checklistId]
    );

    logActivity(req.user.id, 'upload', 'doc_review_file', id, { 
      file_name: req.file.originalname, 
      version: nextVersion,
      checklist_id: req.params.checklistId
    });

    const result = await pool.query('SELECT * FROM doc_review_files WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DOC_REVIEW_FILES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/checklists/:checklistId/files - ดูประวัติไฟล์
// ============================================================
router.get('/checklists/:checklistId/files', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.full_name as uploaded_by_name
       FROM doc_review_files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.checklist_id = ?
       ORDER BY f.version DESC`,
      [req.params.checklistId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[DOC_REVIEW_FILES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/doc-review/files/:id/download - ดาวน์โหลดไฟล์
// ============================================================
router.get('/files/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doc_review_files WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไฟล์' });
    }

    const file = result.rows[0];
    const filePath = path.join(defaultUploadsDir, file.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไฟล์ไม่อยู่ในระบบ' });
    }

    const ext = path.extname(filePath);
    const downloadName = file.file_name.endsWith(ext) ? file.file_name : file.file_name + ext;
    const encodedName = encodeURIComponent(downloadName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    res.download(filePath);
  } catch (error) {
    console.error('[DOC_REVIEW_FILES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// DELETE /api/doc-review/files/:id - ลบไฟล์
// ============================================================
router.delete('/files/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doc_review_files WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไฟล์' });
    }

    const file = result.rows[0];
    const filePath = path.join(defaultUploadsDir, file.file_path);

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await pool.query('DELETE FROM doc_review_files WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'doc_review_file', req.params.id, { file_name: file.file_name });

    res.json({ message: 'ลบไฟล์สำเร็จ' });
  } catch (error) {
    console.error('[DOC_REVIEW_FILES]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 50MB)' });
    }
    return res.status(400).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
  }
  if (err.message === 'ประเภทไฟล์ไม่รองรับ') {
    return res.status(400).json({ error: 'ประเภทไฟล์ไม่รองรับ' });
  }
  next(err);
});

module.exports = router;
