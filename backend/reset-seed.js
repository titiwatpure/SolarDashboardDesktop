/**
 * Reset and Re-seed Checklist Templates
 * ล้างข้อมูล template เก่าทั้งหมด แล้ว seed ใหม่
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath);

const { seedChecklistTemplates } = require('./src/seed-checklist-templates.cjs');

async function resetAndSeed() {
  console.log('🗑️  กำลังล้างข้อมูล template เก่า...');
  
  // ลบ checklist_items ก่อน (foreign key)
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM checklist_items', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('  ✅ ลบ checklist_items แล้ว');

  // ลบ document_checklists
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM document_checklists', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('  ✅ ลบ document_checklists แล้ว');

  console.log('');
  console.log('📋 กำลัง seed ข้อมูลใหม่...');

  // ใช้ pool จาก database module
  const pool = require('./src/database');
  await pool.ready;
  
  await seedChecklistTemplates(pool);
  
  console.log('');
  console.log('✅ ล้างข้อมูลและ seed ใหม่เสร็จสิ้น!');
  
  db.close(() => {
    process.exit(0);
  });
}

resetAndSeed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
