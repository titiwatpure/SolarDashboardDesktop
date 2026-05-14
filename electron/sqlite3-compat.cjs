/**
 * Compatibility wrapper: makes sql.js (pure JS SQLite) look like sqlite3
 * Used only in Electron mode — no native compilation needed
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;

// Pre-initialize SQL at module load
const sqlReady = initSqlJs().then(sql => { SQL = sql; });

class CompatDatabase {
  constructor(dbPath, mode, callback) {
    this._dbPath = dbPath;
    this._db = null;
    this._ready = this._doInit(callback);
  }

  async _doInit(callback) {
    try {
      await sqlReady;
      const buffer = fs.existsSync(this._dbPath) ? fs.readFileSync(this._dbPath) : undefined;
      this._db = buffer ? new SQL.Database(buffer) : new SQL.Database();
      this._db.exec('PRAGMA foreign_keys = ON');
      if (callback) callback(null);
    } catch (err) {
      console.error('sql-compat init error:', err);
      if (callback) callback(err);
    }
  }

  async _ensureReady() {
    if (this._ready) await this._ready;
    if (!this._db) throw new Error('Database not initialized');
  }

  run(sql, paramsOrCallback, maybeCallback) {
    const { params, callback } = this._parseArgs(paramsOrCallback, maybeCallback);
    this._ensureReady().then(() => {
      try {
        this._db.run(sql, params);
        const changes = this._db.getRowsModified();
        this._save();
        const ctx = { changes, lastID: 0 };
        try {
          const rows = this._db.exec('SELECT last_insert_rowid() as id');
          if (rows.length > 0 && rows[0].values.length > 0) {
            ctx.lastID = rows[0].values[0][0];
          }
        } catch (_) {}
        if (callback) callback.call(ctx, null);
      } catch (err) {
        if (callback) callback.call({}, err);
      }
    }).catch(err => {
      if (callback) callback.call({}, err);
    });
    return this;
  }

  all(sql, paramsOrCallback, maybeCallback) {
    const { params, callback } = this._parseArgs(paramsOrCallback, maybeCallback);
    this._ensureReady().then(() => {
      try {
        const stmt = this._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        if (callback) callback(null, rows);
      } catch (err) {
        console.error('sql-compat all error:', err.message, sql);
        if (callback) callback(err);
      }
    }).catch(err => {
      console.error('sql-compat all ready error:', err.message);
      if (callback) callback(err);
    });
    return this;
  }

  get(sql, paramsOrCallback, maybeCallback) {
    const { params, callback } = this._parseArgs(paramsOrCallback, maybeCallback);
    this._ensureReady().then(() => {
      try {
        const stmt = this._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let row = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        if (callback) callback(null, row);
      } catch (err) {
        if (callback) callback(err);
      }
    }).catch(err => {
      if (callback) callback(err);
    });
    return this;
  }

  each(sql, paramsOrCallback, maybeCallback, completeCallback) {
    const { params, callback } = this._parseArgs(paramsOrCallback, maybeCallback);
    this._ensureReady().then(() => {
      try {
        const stmt = this._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let count = 0;
        while (stmt.step()) {
          if (callback) callback(null, stmt.getAsObject());
          count++;
        }
        stmt.free();
        if (completeCallback) completeCallback(null, count);
      } catch (err) {
        if (callback) callback(err);
        if (completeCallback) completeCallback(err);
      }
    }).catch(err => {
      if (callback) callback(err);
      if (completeCallback) completeCallback(err);
    });
    return this;
  }

  exec(sql, callback) {
    this._ensureReady().then(() => {
      try {
        this._db.exec(sql);
        this._save();
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
      }
    }).catch(err => {
      if (callback) callback(err);
    });
    return this;
  }

  serialize(fn) {
    if (fn) fn();
    return this;
  }

  parallelize(fn) {
    if (fn) fn();
    return this;
  }

  close(callback) {
    this._ensureReady().then(() => {
      try {
        this._save();
        this._db.close();
        this._db = null;
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
      }
    }).catch(err => {
      if (callback) callback(err);
    });
  }

  configure(option, value) {
    return this;
  }

  _save() {
    if (!this._dbPath || !this._db) return;
    try {
      const dir = path.dirname(this._dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = this._db.export();
      fs.writeFileSync(this._dbPath, Buffer.from(data));
    } catch (err) {
      console.error('Failed to save database:', err.message);
    }
  }

  _parseArgs(paramsOrCallback, maybeCallback) {
    if (typeof paramsOrCallback === 'function') {
      return { params: [], callback: paramsOrCallback };
    }
    return { params: Array.isArray(paramsOrCallback) ? paramsOrCallback : [], callback: maybeCallback };
  }
}

module.exports = {
  verbose() {
    return {
      Database: CompatDatabase,
      OPEN_READWRITE: 1,
      OPEN_CREATE: 2,
    };
  },
  Database: CompatDatabase,
  _ready: sqlReady,
};
