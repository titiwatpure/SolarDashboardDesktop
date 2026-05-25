const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

const router = express.Router();

// Logo upload config
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const logoDir = path.join(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads'), 'logos');
    if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    cb(null, `company_logo${path.extname(file.originalname)}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ'), false);
    }
  }
});

// GET /api/settings/company
router.get('/company', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM company_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/settings/company
router.put('/company', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const allowedKeys = [
      'company_name', 'address', 'phone', 'email', 'tax_id', 'logo_url', 'storage_path',
      'language', 'theme', 'date_format', 'timezone'
    ];
    const updates = req.body;

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        await pool.query(
          `INSERT INTO company_settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, updates[key] || null, new Date().toISOString()]
        );
      }
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    logActivity(req.user.id, 'update', 'settings', null, { action: 'update_company_settings' }, ipAddress);

    const result = await pool.query('SELECT key, value FROM company_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/settings/logo
router.post('/logo', authenticateToken, authorizeRole(['admin']), logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์' });
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await pool.query(
      `INSERT INTO company_settings (key, value, updated_at) VALUES ('logo_url', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [logoUrl]
    );
    res.json({ logo_url: logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/settings/changelog
router.get('/changelog', authenticateToken, async (req, res) => {
  try {
    const changelogPath = path.join(__dirname, '..', '..', 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return res.json([]);

    const content = fs.readFileSync(changelogPath, 'utf8');
    const entries = [];
    const versionBlocks = content.split(/^## /m).filter(Boolean);

    for (const block of versionBlocks) {
      const lines = block.trim().split('\n');
      const headerMatch = lines[0].match(/^v?([\d.]+)\s*\(([^)]+)\)/);
      if (!headerMatch) continue;
      const changes = lines.slice(1)
        .filter(l => l.startsWith('- '))
        .map(l => l.substring(2).trim());
      entries.push({ version: headerMatch[1], date: headerMatch[2], changes });
    }

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
