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

// ดึงที่เก็บไฟล์จาก company_settings (fallback ไปใช้ default)
async function getUploadsDir() {
  try {
    const result = await pool.query("SELECT value FROM company_settings WHERE key = 'storage_path'");
    const customPath = result.rows[0]?.value;
    if (customPath && customPath.trim()) {
      const dir = customPath.trim();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    }
  } catch {}
  if (!fs.existsSync(defaultUploadsDir)) fs.mkdirSync(defaultUploadsDir, { recursive: true });
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
        } catch {}
      }
      const projectDir = path.join(uploadsDir, folderName);
      if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
      req._uploadDir = projectDir;
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
    let finalName = `${base}${ext}`;
    let counter = 1;
    while (req._uploadDir && fs.existsSync(path.join(req._uploadDir, finalName))) {
      finalName = `${base}_${counter}${ext}`;
      counter++;
    }
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
  let safe = projectName.replace(/[\\/:*?"<>|]/g, '_').replace(/[\s.]+$/g, '').trim();
  if (!safe) safe = 'project';
  if (safe.length > 100) safe = safe.substring(0, 100);
  return `${safe}_${projectCode}`;
}

const getDocumentById = async (id) => {
  const result = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  return result.rows[0] || null;
};

// GET /api/documents/summary — สรุปจำนวนเอกสารตามโครงการ
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.project_id, p.project_name, p.project_code, COUNT(*) as count
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       GROUP BY d.project_id
       ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
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
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
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
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
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
    logActivity(req.user.id, 'download', 'document', req.params.id, {
      document_name: document.document_name,
      project_id: document.project_id,
    }, ipAddress);

    res.download(filePath, document.document_name + path.extname(filePath));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/documents — เพิ่มเอกสารใหม่ (รองรับ file upload)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { project_id, document_name, document_type, description } = req.body;

    if (!project_id || !document_name || !document_type) {
      // ลบไฟล์ที่อัปโหลดมาถ้าข้อมูลไม่ครบ
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'ข้อมูลเอกสารไม่ครบถ้วน' });
    }

    if (document_name.length > 500) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'ชื่อเอกสารยาวเกินไป (สูงสุด 500 ตัวอักษร)' });
    }

    const validDocTypes = ['sld', 'permit', 'test_report', 'other'];
    if (!validDocTypes.includes(document_type)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'ประเภทเอกสารไม่ถูกต้อง' });
    }

    // ตรวจสอบว่า project_id มีอยู่จริง
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectCheck.rows.length === 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();

    // เก็บ path จากไฟล์ที่อัปโหลดเท่านั้น (ไม่รับ file_path จาก user input)
    let filePath = null;
    let fileSize = null;

    if (req.file) {
      const proj = await pool.query('SELECT project_name, project_code FROM projects WHERE id = ?', [project_id]);
      let folderName = project_id;
      if (proj.rows[0]) {
        folderName = sanitizeFolderName(proj.rows[0].project_name, proj.rows[0].project_code);
      }
      filePath = path.join(folderName, req.file.filename).replace(/\\/g, '/');
      fileSize = req.file.size;
    }

    await pool.query(
      `INSERT INTO documents (id, project_id, document_name, document_type, file_path, file_size, upload_by, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, document_name, document_type, filePath, fileSize, req.user.id, description || null]
    );

    const document = await getDocumentById(id);
    logActivity(req.user.id, 'create', 'document', id, { document_name, project_id });
    res.status(201).json(document);
  } catch (error) {
    // ลบไฟล์ถ้ามี error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
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

    // ลบไฟล์จริงถ้ามี
    if (existingDocument.file_path) {
      const uploadsDir = await getUploadsDir();
      const filePath = path.join(uploadsDir, existingDocument.file_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'document', req.params.id, { document_name: existingDocument.document_name });
    res.json({ message: 'ลบเอกสารสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/documents/download-to — ดาวน์โหลดไฟล์ไปยัง path ที่ระบุ (สำหรับ Electron)
router.post('/download-to', authenticateToken, async (req, res) => {
  try {
    const { document_id, save_path } = req.body;
    if (!document_id || !save_path) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
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
    fs.copyFileSync(filePath, save_path);
    logActivity(req.user.id, 'download', 'document', document_id, {
      document_name: document.document_name, project_id: document.project_id,
    }, req.ip || req.socket?.remoteAddress);
    res.json({ success: true, path: save_path });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
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
