const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test on F: drive
const dbPath = path.join(__dirname, 'test-sqlite-temp.db');
console.log('Testing SQLite write to:', dbPath);

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run('PRAGMA journal_mode=WAL', (err) => {
    console.log('WAL mode:', err ? 'FAILED: ' + err.message : 'OK');
  });
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)', (err) => {
    console.log('CREATE TABLE:', err ? 'FAILED: ' + err.message : 'OK');
  });
  db.run("INSERT INTO test (name) VALUES ('hello')", (err) => {
    console.log('INSERT:', err ? 'FAILED: ' + err.message : 'OK');
  });
  db.all('SELECT * FROM test', (err, rows) => {
    console.log('SELECT:', err ? 'FAILED: ' + err.message : rows);
  });
});
db.close((err) => {
  console.log('Close:', err ? 'FAILED: ' + err.message : 'OK');
  // Cleanup
  try { require('fs').unlinkSync(dbPath); } catch {}
  try { require('fs').unlinkSync(dbPath + '-shm'); } catch {}
  try { require('fs').unlinkSync(dbPath + '-wal'); } catch {}
});
