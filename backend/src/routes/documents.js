const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole, authorizePermission } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

const defaultUploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

// Cache uploadsDir to avoid DB query on every request
let _uploadsDirCache = null;
let _uploadsDirCacheTime = 0;
const UPLOADS_DIR_CACHE_TTL = 30_000; // 30 seconds

function invalidateUploadsDirCache() {
  _uploadsDirCache = null;
  _uploadsDirCacheTime = 0;
}

async function getUploadsDir() {
  if (_uploadsDirCache && Date.now() - _uploadsDirCacheTime < UPLOADS_DIR_CACHE_TTL) {
    return _uploadsDirCache;
  }
  try {
    const result = await pool.query("SELECT value FROM company_settings WHERE key = 'storage_path'");
    const customPath = result.rows[0]?.value;
    if (customPath && customPath.trim()) {
      const dir = customPath.trim();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      _uploadsDirCache = dir;
      _uploadsDirCacheTime = Date.now();
      return dir;
    }
  } catch (e) { console.warn('[UPLOADS_DIR] DB query failed, using default:', e.message); }
  if (!fs.existsSync(defaultUploadsDir)) fs.mkdirSync(defaultUploadsDir, { recursive: true });
  _uploadsDirCache = defaultUploadsDir;
  _uploadsDirCacheTime = Date.now();
  return defaultUploadsDir;
}

// ตั้งค่า multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadsDir = await getUploadsDir();
      let folderName = req.body.project_id || 'general';
      if (req.body.project_id) {
        try {
          const proj = await pool.query('SELECT project_name, project_code FROM projects WHERE id = ?', [req.body.project_id]);
          if (proj.rows[0]) {
            folderName = sanitizeFolderName(proj.rows[0].project_name, proj.rows[0].project_code);
          }
        } catch (e) { console.warn('[UPLOAD_DEST] Project lookup failed:', e.message); }
      }
      const projectDir = path.join(uploadsDir, folderName);
      if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
      req._uploadDir = projectDir;
      req._uploadFolderName = folderName;
      cb(null, projectDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    let base = path.basename(file.originalname, ext)
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\s.]+$/g, '')
      .trim();
    if (!base) base = 'file';
    if (base.length > 200) base = base.substring(0, 200);
    const uniqueId = uuidv4().substring(0, 8);
    const finalName = `${base}_${uniqueId}${ext}`;
    cb(null, finalName);
  }
});

// ตรวจสอบประเภทไฟล์
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
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
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

function sanitizeFolderName(projectName, projectCode) {
  const name = projectName || 'project';
  const code = projectCode || 'unknown';
  let safe = name.replace(/[\\/:*?"<>|]/g, '_').replace(/[\s.]+$/g, '').trim();
  if (!safe) safe = 'project';
  if (safe.length > 100) safe = safe.substring(0, 100);
  return `${safe}_${code}`;
}

const getDocumentById = async (id) => {
  const result = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/documents/summary — สรุปจำนวนเอกสารตามโครงการ
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT d.project_id, p.project_name, p.project_code, COUNT(*) as count
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       GROUP BY d.project_id
       ORDER BY count DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(DISTINCT project_id) as count FROM documents'
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
    });
  } catch (error) {
    console.error('[DOC_SUMMARY]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงสรุปเอกสาร' });
  }
});

// GET /api/documents — ดึงเอกสารทั้งหมด (paginated, filter ตาม project_id ได้)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const projectId = req.query.project_id;

    const where = projectId ? 'WHERE d.project_id = ?' : '';
    const params = projectId ? [projectId, limit, offset] : [limit, offset];
    const countParams = projectId ? [projectId] : [];

    const result = await pool.query(
      `SELECT d.*, p.project_name, u.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.upload_by = u.id
       ${where}
       ORDER BY d.uploaded_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM documents d ${where}`, countParams);
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
    console.error('[DOC_LIST]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการเอกสาร' });
  }
});

// GET /api/documents/project/:project_id — ดึงเอกสารตามโครงการ
router.get('/project/:project_id', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT d.*, p.project_name, u.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.upload_by = u.id
       WHERE d.project_id = ?
       ORDER BY d.uploaded_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.project_id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE project_id = ?',
      [req.params.project_id]
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
    });
  } catch (error) {
    console.error('[DOC_PROJECT_LIST]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงเอกสารตามโครงการ' });
  }
});

// GET /api/documents/download/:id — ดาวน์โหลดไฟล์
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document || !document.file_path) {
      return res.status(404).json({ error: 'ไม่พบไฟล์' });
    }

    const uploadsDir = await getUploadsDir();
    const filePath = path.resolve(uploadsDir, document.file_path);
    if (!filePath.startsWith(path.resolve(uploadsDir))) {
      return res.status(403).json({ error: 'ไม่อนุญาต' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไฟล์ไม่อยู่ในระบบ' });
    }

    // Log the download
    const ipAddress = req.ip || req.socket?.remoteAddress;
    await logActivity(req.user.id, 'download', 'document', req.params.id, {
      document_name: document.document_name,
      project_id: document.project_id,
    }, ipAddress);

    const ext = path.extname(filePath);
    const downloadName = document.document_name.endsWith(ext)
      ? document.document_name
      : document.document_name + ext;
    const encodedName = encodeURIComponent(downloadName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    res.download(filePath);
  } catch (error) {
    console.error('[DOC_DOWNLOAD]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดาวน์โหลด' });
  }
});

// POST /api/documents — เพิ่มเอกสารใหม่ (admin/engineer/staff)
router.post('/', authenticateToken, authorizeRole(['admin', 'engineer', 'staff']), upload.single('file'), async (req, res) => {
  try {
    const { project_id, document_type, description } = req.body;
    const document_name = req.body.document_name?.trim();

    const cleanupFile = (filePath) => { try { if (filePath) fs.unlinkSync(filePath); } catch {} };

    if (!project_id || !document_name || !document_type) {
      cleanupFile(req.file?.path);
      return res.status(400).json({ error: 'ข้อมูลเอกสารไม่ครบถ้วน' });
    }

    if (document_name.length > 500) {
      cleanupFile(req.file?.path);
      return res.status(400).json({ error: 'ชื่อเอกสารยาวเกินไป (สูงสุด 500 ตัวอักษร)' });
    }

    const validDocTypes = ['sld', 'permit', 'test_report', 'other'];
    if (!validDocTypes.includes(document_type)) {
      cleanupFile(req.file?.path);
      return res.status(400).json({ error: 'ประเภทเอกสารไม่ถูกต้อง' });
    }

    // ตรวจสอบว่า project_id มีอยู่จริง
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectCheck.rows.length === 0) {
      cleanupFile(req.file?.path);
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();

    // เก็บ path จากไฟล์ที่อัปโหลดเท่านั้น (ไม่รับ file_path จาก user input)
    let filePath = null;
    let fileSize = null;

    if (req.file) {
      const folderName = req._uploadFolderName || project_id;
      filePath = path.join(folderName, req.file.filename).replace(/\\/g, '/');
      fileSize = req.file.size;
    }

    await pool.query(
      `INSERT INTO documents (id, project_id, document_name, document_type, file_path, file_size, upload_by, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, document_name, document_type, filePath, fileSize, req.user.id, description || null]
    );

    const document = await getDocumentById(id);
    await logActivity(req.user.id, 'create', 'document', id, { document_name, project_id });
    res.status(201).json(document);
  } catch (error) {
    // ลบไฟล์ถ้ามี error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('[DOC_UPLOAD]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลด' });
  }
});

// DELETE /api/documents/:id — ลบเอกสาร (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existingDocument = await getDocumentById(req.params.id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'ไม่พบเอกสาร' });
    }

    // ลบไฟล์จริงถ้ามี
    if (existingDocument.file_path) {
      const uploadsDir = await getUploadsDir();
      const filePath = path.join(uploadsDir, existingDocument.file_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete', 'document', req.params.id, { document_name: existingDocument.document_name });
    res.json({ message: 'ลบเอกสารสำเร็จ' });
  } catch (error) {
    console.error('[DOC_DELETE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
  }
});

// POST /api/documents/download-to — ดาวน์โหลดไฟล์ไปยัง path ที่ระบุ (สำหรับ Electron)
router.post('/download-to', authenticateToken, authorizeRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { document_id, save_path } = req.body;
    if (!document_id || !save_path) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    // ป้องกัน path traversal — ห้าม absolute path, UNC path, ../
    const normalized = save_path.replace(/\\/g, '/');
    if (path.isAbsolute(normalized) || normalized.startsWith('//') || normalized.includes('../')) {
      return res.status(403).json({ error: 'ไม่อนุญาตใช้ path นี้' });
    }

    const document = await getDocumentById(document_id);
    if (!document || !document.file_path) {
      return res.status(404).json({ error: 'ไม่พบไฟล์' });
    }
    const uploadsDir = await getUploadsDir();
    const filePath = path.resolve(uploadsDir, document.file_path);
    if (!filePath.startsWith(path.resolve(uploadsDir)) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไฟล์ไม่อยู่ในระบบ' });
    }
    // บันทึกไปยังโฟลเดอร์ downloads ของระบบเท่านั้น
    const downloadsDir = path.join(path.resolve(uploadsDir), '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    const safeFileName = path.basename(normalized).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalPath = path.join(downloadsDir, safeFileName);
    await fs.promises.copyFile(filePath, finalPath);
    await logActivity(req.user.id, 'download', 'document', document_id, {
      document_name: document.document_name, project_id: document.project_id,
    }, req.ip || req.socket?.remoteAddress);
    res.json({ success: true, path: finalPath });
  } catch (error) {
    console.error('[DOC_DOWNLOAD_TO]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
  }
});

// Error handling สำหรับ multer
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
module.exports.invalidateUploadsDirCache = invalidateUploadsDirCache;
