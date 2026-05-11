const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite:', dbPath);
    // C-1: เปิดใช้ Foreign Keys — SQLite ปิดโดย default
    db.run('PRAGMA foreign_keys = ON');
  }
});

// ปิด DB connection เมื่อ server หยุดทำงาน
process.on('SIGINT', () => {
  db.close(() => {
    console.log('SQLite connection closed');
    process.exit(0);
  });
});

// จำลอง interface pool.query() สำหรับ SQLite
// ใช้ ? เป็น placeholder ตรงตาม SQLite ปกติ
const pool = {
  query: (sql, params = []) =>
    new Promise((resolve, reject) => {
      if (/^\s*SELECT\b/i.test(sql)) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Query Error:', err);
            reject(err);
            return;
          }
          resolve({ rows: rows || [], rowCount: rows?.length || 0 });
        });
        return;
      }

      db.run(sql, params, function onRun(err) {
        if (err) {
          console.error('Query Error:', err);
          reject(err);
          return;
        }
        resolve({
          rows: [],
          rowCount: this.changes || 0,
          changes: this.changes || 0,
          lastID: this.lastID
        });
      });
    })
};

module.exports = pool;
