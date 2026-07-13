const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { vacuumDatabase, cleanupOldLogs } = require('../services/maintenance');
const autoBackupService = require('../services/autoBackup');

const router = express.Router();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'solar_dashboard.db');
const backupDir = process.env.BACKUPS_DIR || path.join(__dirname, '..', '..', 'backups');

// สร้าง backups directory ถ้ายังไม่มี
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// ========================
// Auto Backup Settings (ต้องอยู่ก่อน /:name)
// ========================

// GET /api/backup/settings — ดูตั้งค่า auto backup
router.get('/settings', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const settings = autoBackupService.getSettings();
    const backups = autoBackupService.listBackups();
    const lastAutoBackup = backups.find(b => b.type === 'auto');

    res.json({
      settings,
      lastBackup: lastAutoBackup || null,
      nextBackup: calculateNextBackup(settings),
    });
  } catch (error) {
    console.error('Get backup settings error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/backup/settings — ตั้งค่า auto backup
router.put('/settings', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const { enabled, frequency, time, retentionDays } = req.body;

    // Validate time format
    if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return res.status(400).json({ error: 'รูปแบบเวลาไม่ถูกต้อง (HH:MM)' });
    }

    // Validate frequency
    if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({ error: 'ความถี่ไม่ถูกต้อง' });
    }

    // Validate retention
    if (retentionDays && (retentionDays < 7 || retentionDays > 365)) {
      return res.status(400).json({ error: 'ระยะเวลาเก็บต้องอยู่ระหว่าง 7-365 วัน' });
    }

    const newSettings = autoBackupService.updateSettings({
      enabled,
      frequency,
      time,
      retentionDays: retentionDays ? parseInt(retentionDays) : undefined,
    });

    logActivity(req.user.id, 'update', 'backup_settings', null, { settings: newSettings });

    res.json({
      message: 'อัปเดตตั้งค่าสำเร็จ',
      settings: newSettings,
      nextBackup: calculateNextBackup(newSettings),
    });
  } catch (error) {
    console.error('Update backup settings error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/backup/auto-now — สร้าง backup ทันที (for testing)
router.post('/auto-now', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const backup = autoBackupService.createBackup('auto');
    logActivity(req.user.id, 'backup', 'database', null, backup);
    res.json({ message: 'สร้าง backup สำเร็จ', backup });
  } catch (error) {
    console.error('Auto backup error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ========================
// Manual Backup Endpoints
// ========================

// POST /api/backup — สำรองฐานข้อมูล (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ฐานข้อมูล' });
    }

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `solar_dashboard_backup_${date}.db`;
    const backupPath = path.join(backupDir, backupName);

    // Copy database file as backup
    fs.copyFileSync(dbPath, backupPath);

    const stats = fs.statSync(backupPath);

    logActivity(req.user.id, 'backup', 'database', null, {
      backup_name: backupName,
      file_size: stats.size,
    });

    res.json({
      message: 'สำรองฐานข้อมูลสำเร็จ',
      backup: {
        name: backupName,
        size: stats.size,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสำรองข้อมูล' });
  }
});

// GET /api/backup — รายการ backup ทั้งหมด (Admin only)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: stats.size,
          created_at: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(files);
  } catch (error) {
    console.error('Backup list error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/backup/download/:name — ดาวน์โหลดไฟล์ backup (Admin only)
router.get('/download/:name', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.name);

    // ป้องกัน path traversal
    if (!path.resolve(backupPath).startsWith(path.resolve(backupDir))) {
      return res.status(403).json({ error: 'ไม่อนุญาต' });
    }

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ backup' });
    }

    logActivity(req.user.id, 'download', 'backup', null, { backup_name: req.params.name });

    res.download(backupPath, req.params.name);
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/backup/restore/:name — กู้คืนฐานข้อมูลจาก backup (Admin only)
router.post('/restore/:name', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.name);

    if (!path.resolve(backupPath).startsWith(path.resolve(backupDir))) {
      return res.status(403).json({ error: 'ไม่อนุญาต' });
    }

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ backup' });
    }

    // สำรองไฟล์ปัจจุบันก่อนกู้คืน
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const preRestoreName = `solar_dashboard_pre_restore_${date}.db`;
    const preRestorePath = path.join(backupDir, preRestoreName);

    fs.copyFileSync(dbPath, preRestorePath);

    // เขียนไฟล์ backup ลงทับ — server ต้อง restart เพื่อโหลด DB ใหม่
    fs.copyFileSync(backupPath, dbPath);

    logActivity(req.user.id, 'restore', 'database', null, {
      restored_from: req.params.name,
      pre_restore_backup: preRestoreName,
    });

    res.json({
      message: 'กู้คืนฐานข้อมูลสำเร็จ กรุณา restart server',
      pre_restore_backup: preRestoreName,
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการกู้คืน' });
  }
});

// DELETE /api/backup/:name — ลบไฟล์ backup (Admin only)
// ต้องอยู่หลัง routes อื่นๆ ที่ใช้ path pattern ชัดเจน
router.delete('/:name', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.name);

    if (!path.resolve(backupPath).startsWith(path.resolve(backupDir))) {
      return res.status(403).json({ error: 'ไม่อนุญาต' });
    }

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ backup' });
    }

    fs.unlinkSync(backupPath);

    logActivity(req.user.id, 'delete', 'backup', null, { backup_name: req.params.name });

    res.json({ message: 'ลบไฟล์ backup สำเร็จ' });
  } catch (error) {
    console.error('Backup delete error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/backup/vacuum — VACUUM ฐานข้อมูล (Admin only)
router.post('/vacuum', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    await vacuumDatabase();
    logActivity(req.user.id, 'vacuum', 'database', null, {});
    res.json({ message: 'VACUUM สำเร็จ' });
  } catch (error) {
    console.error('Vacuum error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการ VACUUM' });
  }
});

// POST /api/backup/cleanup — ลบ logs เก่า (Admin only)
router.post('/cleanup', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await cleanupOldLogs();
    logActivity(req.user.id, 'cleanup', 'database', null, result);
    res.json({ message: 'Cleanup สำเร็จ', ...result });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการ cleanup' });
  }
});

// Helper: คำนวณเวลา backup ถัดไป
function calculateNextBackup(settings) {
  if (!settings.enabled) return null;

  const now = new Date();
  const [hours, minutes] = settings.time.split(':').map(Number);
  
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);

  // ถ้าเลยเวลาแล้ว ให้เลื่อนไปวันถัดไป
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // ปรับตาม frequency
  if (settings.frequency === 'weekly') {
    // ถ้าไม่ใช่วันอาทิตย์ ให้เลื่อนไปอาทิตย์ถัดไป
    while (next.getDay() !== 0) {
      next.setDate(next.getDate() + 1);
    }
  } else if (settings.frequency === 'monthly') {
    // ถ้าไม่ใช่วันที่ 1 ให้เลื่อนไปเดือนถัดไป
    if (next.getDate() !== 1) {
      next.setMonth(next.getMonth() + 1, 1);
    }
  }

  return next.toISOString();
}

module.exports = router;
