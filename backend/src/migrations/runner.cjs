const fs = require('fs');
const path = require('path');

/**
 * Migration Runner
 * จัดการ database migrations อย่างมีระเบียบ
 * - สร้าง schema_migrations table เพื่อ track migration ที่รันแล้ว
 * - อ่าน migration files จากโฟลเดอร์นี้
 * - รันเฉพาะ migration ที่ยังไม่ได้ applied
 */
async function runMigrations(db) {
  const runSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const allSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  // สร้าง schema_migrations table ถ้ายังไม่มี
  await runSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ดึง migration ที่ applied แล้ว
  const applied = await allSql('SELECT name FROM schema_migrations ORDER BY name');
  const appliedSet = new Set(applied.map(r => r.name));

  // อ่าน migration files
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d{3}_.*\.cjs$/))
    .sort();

  if (files.length === 0) {
    console.log('  ℹ️  ไม่มี migration files');
    return;
  }

  // รัน migration ที่ยังไม่ applied
  let ran = 0;
  for (const file of files) {
    const name = file.replace('.cjs', '');
    if (appliedSet.has(name)) continue;

    console.log(`  ⏳ กำลังรัน migration: ${name}`);
    try {
      const migration = require(path.join(migrationsDir, file));
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} ไม่มี up() function`);
      }
      await migration.up(runSql);
      await runSql('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
      console.log(`  ✅ Migration ${name} สำเร็จ`);
      ran++;
    } catch (err) {
      console.error(`  ❌ Migration ${name} ล้มเหลว:`, err.message);
      throw err; // หยุดไม่รัน migration ต่อไป
    }
  }

  if (ran === 0) {
    console.log('  ℹ️  ทุก migration รันแล้ว');
  } else {
    console.log(`  ✅ รัน migration สำเร็จ ${ran} ไฟล์`);
  }
}

module.exports = { runMigrations };
