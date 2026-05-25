const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite:', dbPath);
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA busy_timeout = 5000');
    db.run('PRAGMA cache_size = -64000');
  }
});

// ปิด DB connection เมื่อ server หยุดทำงาน
process.on('SIGINT', () => {
  db.close(() => {
    console.log('SQLite connection closed');
    process.exit(0);
  });
});

const isReadQuery = (sql) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);
const SLOW_QUERY_MS = 100;

const pool = {
  query: (sql, params = []) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      if (isReadQuery(sql)) {
        db.all(sql, params, (err, rows) => {
          const elapsed = Date.now() - start;
          if (elapsed >= SLOW_QUERY_MS) console.warn(`[SLOW QUERY ${elapsed}ms]`, sql.substring(0, 120));
          if (err) { console.error('Query Error:', err); reject(err); return; }
          const normalized = (rows || []).map(row => {
            const fixed = { ...row };
            for (const key of Object.keys(fixed)) {
              if (typeof fixed[key] === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fixed[key])) {
                fixed[key] = fixed[key] + 'Z';
              }
            }
            return fixed;
          });
          resolve({ rows: normalized, rowCount: normalized.length });
        });
        return;
      }

      db.run(sql, params, function onRun(err) {
        const elapsed = Date.now() - start;
        if (elapsed >= SLOW_QUERY_MS) console.warn(`[SLOW QUERY ${elapsed}ms]`, sql.substring(0, 120));
        if (err) { console.error('Query Error:', err); reject(err); return; }
        resolve({ rows: [], rowCount: this.changes || 0, changes: this.changes || 0, lastID: this.lastID });
      });
    }),

  run: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) { reject(err); return; }
        resolve({ changes: this.changes || 0, lastID: this.lastID });
      });
    }),

  exec: (sql) =>
    new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) { reject(err); return; }
        resolve();
      });
    }),

  transaction: async (fn) => {
    await pool.run('BEGIN');
    try {
      const result = await fn(pool);
      await pool.run('COMMIT');
      return result;
    } catch (err) {
      await pool.run('ROLLBACK').catch(() => {});
      throw err;
    }
  }
};

module.exports = pool;
