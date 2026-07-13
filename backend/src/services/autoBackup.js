const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'solar_dashboard.db');
const backupDir = process.env.BACKUPS_DIR || path.join(__dirname, '..', '..', 'backups');

// สร้าง backups directory ถ้ายังไม่มี
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// ค่าตั้ง default
const DEFAULT_SETTINGS = {
  enabled: false,
  frequency: 'daily',    // daily, weekly, monthly
  time: '02:00',         // เวลา backup (HH:MM)
  retentionDays: 30,     // เก็บ backup กี่วัน
};

// โหลด settings จากไฟล์
let settings = { ...DEFAULT_SETTINGS };
const settingsPath = path.join(backupDir, 'auto-backup-settings.json');

if (fs.existsSync(settingsPath)) {
  try {
    const data = fs.readFileSync(settingsPath, 'utf8');
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.error('[AutoBackup] Failed to load settings:', error.message);
  }
}

// บันทึกลงไฟล์
const saveSettings = () => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('[AutoBackup] Failed to save settings:', error.message);
  }
};

// สร้าง backup
const createBackup = (type = 'manual') => {
  try {
    if (!fs.existsSync(dbPath)) {
      throw new Error('ไม่พบไฟล์ฐานข้อมูล');
    }

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = type === 'auto' ? 'auto_backup' : 'manual_backup';
    const backupName = `${prefix}_${date}.db`;
    const backupPath = path.join(backupDir, backupName);

    // Copy database file
    fs.copyFileSync(dbPath, backupPath);

    const stats = fs.statSync(backupPath);
    console.log(`[AutoBackup] Created: ${backupName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // ลบ backup เก่าถ้าเป็น auto
    if (type === 'auto') {
      cleanupOldBackups();
    }

    return {
      name: backupName,
      size: stats.size,
      created_at: new Date().toISOString(),
      type: type,
    };
  } catch (error) {
    console.error('[AutoBackup] Failed to create backup:', error.message);
    throw error;
  }
};

// ลบ backup เก่า
const cleanupOldBackups = () => {
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_backup_'));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);

    let deleted = 0;
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deleted++;
        console.log(`[AutoBackup] Deleted old backup: ${file}`);
      }
    });

    if (deleted > 0) {
      console.log(`[AutoBackup] Cleaned up ${deleted} old backups`);
    }
  } catch (error) {
    console.error('[AutoBackup] Cleanup error:', error.message);
  }
};

// ดึงรายการ backup
const listBackups = () => {
  try {
    return fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: stats.size,
          created_at: stats.mtime.toISOString(),
          type: f.startsWith('auto_backup_') ? 'auto' : 'manual',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('[AutoBackup] List error:', error.message);
    return [];
  }
};

// ตั้งค่า auto backup
const updateSettings = (newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  console.log('[AutoBackup] Settings updated:', settings);
  return settings;
};

// ดึงตั้งค่า
const getSettings = () => ({ ...settings });

module.exports = {
  createBackup,
  listBackups,
  updateSettings,
  getSettings,
  cleanupOldBackups,
};
