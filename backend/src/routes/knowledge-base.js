/**
 * Knowledge Base API
 * จัดการฐานความรู้สำหรับ Chatbot
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for knowledge base files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'knowledge');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|md/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('อนุญาตเฉพาะไฟล์: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, csv, md'));
  }
});

// GET /api/knowledge-base — ดึงรายการทั้งหมด
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM knowledge_base';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(topic LIKE ? OR content LIKE ? OR keywords LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (req.query.folder) {
      conditions.push('folder = ?');
      params.push(req.query.folder);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY updated_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/knowledge-base/:id — ดึงรายการเดียว
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM knowledge_base WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/knowledge-base — สร้างใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { topic, content, keywords, category, folder } = req.body;
    if (!topic || !content) {
      return res.status(400).json({ error: 'กรุณาระบุหัวข้อและเนื้อหา' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO knowledge_base (id, topic, content, keywords, category, folder, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, topic, content, keywords || '', category || 'general', folder || 'ทั่วไป', req.user.id]
    );

    const result = await pool.query('SELECT * FROM knowledge_base WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/knowledge-base/upload — อัปโหลดไฟล์
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์' });

    const { topic, keywords, category } = req.body;
    const id = uuidv4();
    const filePath = `/uploads/knowledge/${req.file.filename}`;

    // อ่านข้อความจากไฟล์ (เบื้องต้น)
    let content = '';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.md') {
      content = fs.readFileSync(req.file.path, 'utf-8');
    }

    await pool.query(
      'INSERT INTO knowledge_base (id, topic, content, keywords, category, file_path, file_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, topic || req.file.originalname, content, keywords || '', category || 'general', filePath, ext, req.user.id]
    );

    const result = await pool.query('SELECT * FROM knowledge_base WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/knowledge-base/:id — อัปเดต
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { topic, content, keywords, category, folder } = req.body;
    const setClauses = [];
    const values = [];

    if (topic !== undefined) { setClauses.push('topic = ?'); values.push(topic); }
    if (content !== undefined) { setClauses.push('content = ?'); values.push(content); }
    if (keywords !== undefined) { setClauses.push('keywords = ?'); values.push(keywords); }
    if (category !== undefined) { setClauses.push('category = ?'); values.push(category); }
    if (folder !== undefined) { setClauses.push('folder = ?'); values.push(folder); }

    if (setClauses.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' });

    setClauses.push('updated_at = datetime("now")');
    values.push(req.params.id);

    await pool.query(`UPDATE knowledge_base SET ${setClauses.join(', ')} WHERE id = ?`, values);
    const result = await pool.query('SELECT * FROM knowledge_base WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/knowledge-base/:id — ลบ
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // ลบไฟล์ถ้ามี
    const result = await pool.query('SELECT file_path FROM knowledge_base WHERE id = ?', [req.params.id]);
    if (result.rows.length > 0 && result.rows[0].file_path) {
      const filePath = path.join(__dirname, '..', result.rows[0].file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM knowledge_base WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบข้อมูลแล้ว' });
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/knowledge-base/categories — ดึงหมวดหมู่ทั้งหมด
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category, COUNT(*) as count FROM knowledge_base GROUP BY category ORDER BY count DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/knowledge-base/folders — ดึงโฟลเดอร์ทั้งหมด
router.get('/folders/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT folder, COUNT(*) as count FROM knowledge_base GROUP BY folder ORDER BY count DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('[KNOWLEDGE_BASE]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
