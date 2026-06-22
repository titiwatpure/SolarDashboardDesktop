const pool = require('../database');

const CLEANUP_DAYS = 365;
const VACUUM_KEY = 'last_vacuum_at';
const CLEANUP_KEY = 'last_cleanup_at';
const CHECKPOINT_KEY = 'last_wal_checkpoint_at';

async function getLastRun(key) {
  const { rows } = await pool.query(
    'SELECT value FROM company_settings WHERE key = ?', [key]
  );
  return rows[0]?.value || null;
}

async function setLastRun(key) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO company_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, now]
  );
}

async function cleanupOldLogs() {
  const cutoff = `datetime('now', '-${CLEANUP_DAYS} days')`;
  const actResult = await pool.query(
    `DELETE FROM activity_logs WHERE created_at < ${cutoff}`
  );
  const notifResult = await pool.query(
    `DELETE FROM notifications WHERE created_at < ${cutoff}`
  );
  const timelineResult = await pool.query(
    `DELETE FROM timeline_comments WHERE created_at < ${cutoff}`
  );
  const checkpointLogs = await pool.query(
    `DELETE FROM checkpoint_logs WHERE created_at < ${cutoff}`
  );

  await setLastRun(CLEANUP_KEY);

  return {
    activity_logs: actResult.changes || 0,
    notifications: notifResult.changes || 0,
    timeline_comments: timelineResult.changes || 0,
    checkpoint_logs: checkpointLogs.changes || 0,
  };
}

async function vacuumDatabase() {
  await pool.query('VACUUM');
  await setLastRun(VACUUM_KEY);
  return { success: true };
}

async function checkpointWal() {
  try {
    await pool.query('PRAGMA wal_checkpoint(TRUNCATE)');
    await setLastRun(CHECKPOINT_KEY);
    return { success: true };
  } catch (err) {
    console.error('WAL checkpoint error:', err.message);
    return { success: false, error: err.message };
  }
}

function daysSince(isoDate) {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / 86400000;
}

async function runMaintenance() {
  const results = {};

  // WAL checkpoint — ทำทุกวันเพื่อป้องกัน WAL file ใหญ่เกินไป
  const lastCheckpoint = await getLastRun(CHECKPOINT_KEY);
  if (daysSince(lastCheckpoint) >= 1) {
    results.checkpoint = await checkpointWal();
  }

  const lastVacuum = await getLastRun(VACUUM_KEY);
  if (daysSince(lastVacuum) >= 30) {
    await vacuumDatabase();
    results.vacuum = 'done';
  }

  const lastCleanup = await getLastRun(CLEANUP_KEY);
  if (daysSince(lastCleanup) >= 7) {
    results.cleanup = await cleanupOldLogs();
  }

  return results;
}

module.exports = { runMaintenance, cleanupOldLogs, vacuumDatabase, checkpointWal };
