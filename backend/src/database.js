const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const HEALTH_CHECK_INTERVAL_MS = 10000;
const SLOW_QUERY_LOG_MS = 5000;
const QUERY_RETRY_COUNT = 3;
const QUERY_RETRY_DELAYS = [100, 300, 700];
const isDev = process.env.NODE_ENV !== 'production';

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
      if (isDev) console.log('Connected to SQLite:', dbPath);
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

// Reconnect helper — ใช้เฉพาะ connection errors
async function reconnectOnce() {
  if (isClosing) return;
  if (isDev) console.log('[DB] Attempting reconnect...');
  try {
    await openDatabase(1);
    if (isDev) console.log('[DB] Reconnect succeeded');
  } catch (err) {
    console.error('[DB] Reconnect failed:', err.message);
  }
}

// Check if error is connection-related (值得 reconnect)
function isConnectionError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('database is closed') ||
         msg.includes('connection') ||
         msg.includes('econnrefused') ||
         msg.includes('econnreset') ||
         msg.includes('sqlite_busy') ||
         msg.includes('sqlite_locked') ||
         err.code === 'SQLITE_BUSY' ||
         err.code === 'SQLITE_LOCKED' ||
         err.code === 'SQLITE_CORRUPT';
}

// Check if error is retryable (SQLITE_BUSY / SQLITE_LOCKED only)
function isRetryableError(err) {
  if (!err) return false;
  return err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED';
}

// Sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sanitize SQL for logging — ตัด parameter values ออก
function sanitizeSql(sql) {
  return (sql || '').substring(0, 150).replace(/\?\s*,?/g, '?');
}

// Periodic health check — reconnect if DB becomes unresponsive
let healthCheckTimer = null;

function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(() => {
    if (!db || isClosing) return;
    db.get('SELECT 1', (err) => {
      if (err) {
        console.error('[DB] Health check failed:', err.message);
        reconnectOnce();
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

function ensureDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Execute query with retry for SQLITE_BUSY/SQLITE_LOCKED
function execWithRetry(conn, method, sql, params) {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount) => {
      conn[method](sql, params, function onResult(err, result) {
        if (err && isRetryableError(err) && retryCount < QUERY_RETRY_COUNT) {
          const delay = QUERY_RETRY_DELAYS[retryCount] || 700;
          if (isDev) console.warn(`[DB] Retry ${retryCount + 1}/${QUERY_RETRY_COUNT} after ${delay}ms (${err.code})`);
          setTimeout(() => attempt(retryCount + 1), delay);
          return;
        }
        if (err) return reject(err);
        resolve(result);
      });
    };
    attempt(0);
  });
}

const pool = {
  ready: dbReady,

  query: async (sql, params = []) => {
    await dbReady;
    let conn = ensureDb();
    const start = Date.now();

    try {
      let result;
      if (isReadQuery(sql)) {
        result = await execWithRetry(conn, 'all', sql, params);
      } else {
        result = await execWithRetry(conn, 'run', sql, params);
      }

      const elapsed = Date.now() - start;

      // Log slow queries (>5s)
      if (elapsed >= SLOW_QUERY_LOG_MS) {
        console.warn(`[SLOW QUERY ${elapsed}ms]`, sanitizeSql(sql));
      }

      if (isReadQuery(sql)) {
        const rows = (result || []).map(row => {
          const fixed = { ...row };
          for (const key of Object.keys(fixed)) {
            if (typeof fixed[key] === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fixed[key])) {
              fixed[key] = fixed[key] + 'Z';
            }
          }
          return fixed;
        });
        return { rows, rowCount: rows.length };
      }

      return { rows: [], rowCount: result?.changes || 0, changes: result?.changes || 0, lastID: result?.lastID };
    } catch (err) {
      // Auto reconnect สำหรับ connection errors เท่านั้น
      if (isConnectionError(err) && !isRetryableError(err)) {
        console.error('[DB] Connection error, reconnecting:', err.message);
        await reconnectOnce();
        // ลอง query อีกครั้งหลัง reconnect
        conn = ensureDb();
        try {
          if (isReadQuery(sql)) {
            const rows = await new Promise((res, rej) => {
              conn.all(sql, params, (e, r) => e ? rej(e) : res(r));
            });
            return { rows: rows || [], rowCount: (rows || []).length };
          } else {
            const result = await new Promise((res, rej) => {
              conn.run(sql, params, function (e) { e ? rej(e) : res({ changes: this.changes, lastID: this.lastID }); });
            });
            return { rows: [], rowCount: result.changes || 0, changes: result.changes || 0, lastID: result.lastID };
          }
        } catch (retryErr) {
          console.error('[DB] Query failed after reconnect:', sanitizeSql(sql), retryErr.message);
          throw retryErr;
        }
      }
      console.error('[DB] Query error:', sanitizeSql(sql), err.message);
      throw err;
    }
  },

  run: async (sql, params = []) => {
    return pool.query(sql, params);
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
