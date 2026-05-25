const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const HEALTH_CHECK_INTERVAL_MS = 30000;

let db = null;
let isClosing = false;

function applyPragmas(database) {
  return new Promise((resolve, reject) => {
    database.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) return reject(err);
      database.run('PRAGMA journal_mode = WAL');
      database.run('PRAGMA synchronous = NORMAL');
      database.run('PRAGMA busy_timeout = 5000');
      database.run('PRAGMA cache_size = -64000');
      resolve();
    });
  });
}

async function openDatabase(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      db = await new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(dbPath, (err) => {
          if (err) return reject(err);
          resolve(conn);
        });
      });
      await applyPragmas(db);
      console.log('Connected to SQLite:', dbPath);
      return;
    } catch (err) {
      console.error(`DB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      } else {
        throw new Error(`Failed to open SQLite after ${retries} attempts: ${err.message}`);
      }
    }
  }
}

// Periodic health check — reconnect if DB becomes unresponsive
let healthCheckTimer = null;

function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(() => {
    if (!db || isClosing) return;
    db.get('SELECT 1', (err) => {
      if (err) {
        console.error('DB health check failed, reconnecting:', err.message);
        openDatabase().catch((e) => console.error('DB reconnect failed:', e.message));
      }
    });
  }, HEALTH_CHECK_INTERVAL_MS);
}

// Initialize — export so callers can await readiness
const dbReady = openDatabase().then(() => startHealthCheck());

// Graceful shutdown
process.on('SIGINT', () => {
  isClosing = true;
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  if (db) {
    db.close(() => {
      console.log('SQLite connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

const isReadQuery = (sql) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);
const SLOW_QUERY_MS = 100;

function ensureDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const pool = {
  ready: dbReady,

  query: async (sql, params = []) => {
    await dbReady;
    const conn = ensureDb();
    return new Promise((resolve, reject) => {
      const start = Date.now();
      if (isReadQuery(sql)) {
        conn.all(sql, params, (err, rows) => {
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

      conn.run(sql, params, function onRun(err) {
        const elapsed = Date.now() - start;
        if (elapsed >= SLOW_QUERY_MS) console.warn(`[SLOW QUERY ${elapsed}ms]`, sql.substring(0, 120));
        if (err) { console.error('Query Error:', err); reject(err); return; }
        resolve({ rows: [], rowCount: this.changes || 0, changes: this.changes || 0, lastID: this.lastID });
      });
    });
  },

  run: async (sql, params = []) => {
    await dbReady;
    const conn = ensureDb();
    return new Promise((resolve, reject) => {
      conn.run(sql, params, function onRun(err) {
        if (err) { reject(err); return; }
        resolve({ changes: this.changes || 0, lastID: this.lastID });
      });
    });
  },

  exec: async (sql) => {
    await dbReady;
    const conn = ensureDb();
    return new Promise((resolve, reject) => {
      conn.exec(sql, (err) => {
        if (err) { reject(err); return; }
        resolve();
      });
    });
  },

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
