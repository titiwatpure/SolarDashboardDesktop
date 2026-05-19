/**
 * Stress Test — สร้างข้อมูลจำลอง + วัด response time
 * ใช้: node stress-test.cjs
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const dbPath = path.join(__dirname, 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath);
const BASE = 'http://localhost:5000';

// ========================
// Helper
// ========================
const uuid = () => crypto.randomUUID();
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

const PROVINCES = ['กรุงเทพ', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'ชลบุรี', 'เชียงใหม่', 'ขอนแก่น', 'นครราชสีมา', 'ภูเก็ต', 'สงขลา', 'ระยอง', 'นครปฐม', 'สุพรรณบุรี', 'พระนครศรีอยุธยา', 'อุดรธานี'];
const STEPS = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];
const STATUSES = ['not_started', 'in_progress', 'waiting', 'blocked', 'completed'];
const DOC_TYPES = ['sld', 'permit', 'test_report', 'other'];
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ========================
// สร้างข้อมูลจำลอง
// ========================
async function seed() {
  console.log('=== สร้างข้อมูลจำลอง ===\n');

  // ดึง user_id ที่มีอยู่
  const users = await query('SELECT id FROM users');
  const userId = users[0]?.id || uuid();

  const PROJECT_COUNT = 500;
  const projectIds = [];

  // Projects
  console.log(`กำลังสร้าง ${PROJECT_COUNT} โครงการ...`);
  for (let i = 0; i < PROJECT_COUNT; i++) {
    const id = uuid();
    projectIds.push(id);
    const step = randomFrom(STEPS);
    const status = randomFrom(STATUSES);
    const sizeKw = randomBetween(10, 500);
    await run(
      `INSERT OR IGNORE INTO projects (id, project_name, project_code, size_kw, province, status, current_step, responsible_user, start_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, `โครงการ Solar ${PROVINCES[randomBetween(0, PROVINCES.length - 1)]} #${i + 1}`, `P${6800 + i}`, sizeKw, randomFrom(PROVINCES), status, step, userId, randomDate(new Date('2025-01-01'), new Date('2026-05-01')), randomDate(new Date('2025-01-01'), new Date('2026-05-19'))]
    );
  }
  console.log(`  ✓ projects: ${PROJECT_COUNT}`);

  // Documents (เฉลี่ย 8 ต่อโครงการ)
  console.log('กำลังสร้างเอกสาร...');
  let docCount = 0;
  for (const pid of projectIds) {
    const count = randomBetween(3, 12);
    for (let j = 0; j < count; j++) {
      await run(
        `INSERT INTO documents (id, project_id, document_name, document_type, file_size, upload_by, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), pid, `เอกสาร_${j + 1}_${randomFrom(DOC_TYPES)}`, randomFrom(DOC_TYPES), randomBetween(10000, 50000000), userId, randomDate(new Date('2025-06-01'), new Date('2026-05-19'))]
      );
      docCount++;
    }
  }
  console.log(`  ✓ documents: ${docCount}`);

  // Activity Logs (15000 รายการ)
  console.log('กำลังสร้าง activity logs...');
  const actions = ['create', 'update', 'delete', 'login', 'logout', 'download', 'upload', 'view'];
  const entities = ['project', 'document', 'user', 'task', 'contract', 'quotation'];
  const batchSize = 500;
  const LOG_COUNT = 15000;
  for (let i = 0; i < LOG_COUNT; i += batchSize) {
    const batch = [];
    const end = Math.min(i + batchSize, LOG_COUNT);
    for (let j = i; j < end; j++) {
      batch.push(new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, severity, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), userId, randomFrom(actions), randomFrom(entities), randomFrom(projectIds), randomFrom(['info', 'warning', 'error']), randomDate(new Date('2025-01-01'), new Date('2026-05-19'))],
          (err) => err ? reject(err) : resolve()
        );
      }));
    }
    await Promise.all(batch);
    process.stdout.write(`  ✓ activity_logs: ${end}/${LOG_COUNT}\r`);
  }
  console.log(`  ✓ activity_logs: ${LOG_COUNT}`);

  // Tasks
  console.log('กำลังสร้าง tasks...');
  let taskCount = 0;
  for (const pid of projectIds) {
    const count = randomBetween(2, 10);
    for (let j = 0; j < count; j++) {
      await run(
        `INSERT INTO tasks (id, project_id, title, status, priority, assigned_to, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), pid, `งาน #${j + 1} - ${randomFrom(['สำรวจ', 'ออกแบบ', 'ยื่นขออนุญาต', 'ก่อสร้าง', 'ทดสอบ', 'ส่งมอบ'])}`, randomFrom(TASK_STATUSES), randomFrom(PRIORITIES), userId, randomDate(new Date('2025-03-01'), new Date('2026-05-19'))]
      );
      taskCount++;
    }
  }
  console.log(`  ✓ tasks: ${taskCount}`);

  // Project Timeline
  console.log('กำลังสร้าง project_timeline...');
  let tlCount = 0;
  for (const pid of projectIds) {
    const count = randomBetween(1, 8);
    for (let j = 0; j < count; j++) {
      await run(
        `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), pid, randomFrom(STEPS), randomFrom(['pending', 'in_progress', 'completed']), `ดำเนินการขั้นตอนที่ ${j + 1}`, userId, randomDate(new Date('2025-03-01'), new Date('2026-05-19'))]
      );
      tlCount++;
    }
  }
  console.log(`  ✓ project_timeline: ${tlCount}`);

  // Checkpoints
  console.log('กำลังสร้าง checkpoints...');
  let cpCount = 0;
  for (const pid of projectIds) {
    for (const step of STEPS) {
      await run(
        `INSERT INTO checkpoints (id, project_id, step, checkpoint_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), pid, step, `ตรวจสอบ ${step}`, randomFrom(['pending', 'passed', 'failed']), randomDate(new Date('2025-03-01'), new Date('2026-05-19'))]
      );
      cpCount++;
    }
  }
  console.log(`  ✓ checkpoints: ${cpCount}`);

  // Notifications
  console.log('กำลังสร้าง notifications...');
  let notifCount = 0;
  for (let i = 0; i < 5000; i++) {
    await run(
      `INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), userId, randomFrom(['info', 'warning', 'success']), `แจ้งเตือน #${i + 1}`, `รายละเอียดแจ้งเตือน ${i + 1}`, randomBetween(0, 1), randomDate(new Date('2025-06-01'), new Date('2026-05-19'))]
    );
    notifCount++;
  }
  console.log(`  ✓ notifications: ${notifCount}`);

  // Customers
  console.log('กำลังสร้าง customers...');
  let custCount = 0;
  for (let i = 0; i < 200; i++) {
    await run(
      `INSERT INTO customers (id, customer_name, customer_type, contact_name, contact_phone, contact_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), `ลูกค้า ${i + 1}`, randomFrom(['บุคคลธรรมดา', 'นิติบุคคล']), `ผู้ติดต่อ ${i + 1}`, `08${randomBetween(10000000, 99999999)}`, `customer${i + 1}@test.com`, randomDate(new Date('2025-01-01'), new Date('2026-05-19'))]
    );
    custCount++;
  }
  console.log(`  ✓ customers: ${custCount}`);

  console.log('\n=== สร้างข้อมูลเสร็จ ===\n');
}

// ========================
// วัด Response Time
// ========================
async function benchmark() {
  console.log('=== วัด Response Time ===\n');

  // Login
  const token = await login();
  if (!token) { console.error('Login ไม่สำเร็จ'); process.exit(1); }

  const endpoints = [
    { name: 'GET /api/health (ไม่มี auth)', auth: false },
    { name: 'GET /api/projects', auth: true },
    { name: 'GET /api/projects?page=1&limit=50', auth: true },
    { name: 'GET /api/documents', auth: true },
    { name: 'GET /api/documents?page=1&limit=50', auth: true },
    { name: 'GET /api/documents/summary', auth: true },
    { name: 'GET /api/customers', auth: true },
    { name: 'GET /api/tasks', auth: true },
    { name: 'GET /api/activity-logs', auth: true },
    { name: 'GET /api/activity-logs?page=1&limit=50', auth: true },
    { name: 'GET /api/notifications', auth: true },
    { name: 'GET /api/reports', auth: true },
    { name: 'GET /api/organizations', auth: true },
  ];

  const results = [];

  for (const ep of endpoints) {
    const times = [];
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      const time = await measureGet(ep.name.split(' ')[1], ep.auth ? token : null);
      times.push(time);
    }
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const min = Math.min(...times);
    const max = Math.max(...times);
    results.push({ name: ep.name, avg, min, max, times });
  }

  // แสดงผล
  console.log('\n┌─────────────────────────────────────────────────────────┬─────────┬─────────┬─────────┐');
  console.log('│ Endpoint                                                │ Avg(ms) │ Min(ms) │ Max(ms) │');
  console.log('├─────────────────────────────────────────────────────────┼─────────┼─────────┼─────────┤');
  for (const r of results) {
    const name = r.name.padEnd(55);
    const avg = String(r.avg).padStart(7);
    const min = String(r.min).padStart(7);
    const max = String(r.max).padStart(7);
    const flag = r.avg >= 200 ? ' ⚠️' : r.avg >= 100 ? ' ⚡' : ' ✅';
    console.log(`│ ${name} │${avg} │${min} │${max} │${flag}`);
  }
  console.log('└─────────────────────────────────────────────────────────┴─────────┴─────────┴─────────┘');

  // แสดง slow queries จาก server log
  console.log('\n💡 ดู [SLOW QUERY] และ [SLOW API] ใน console ของ server เพิ่มเติม');
}

// ========================
// Helper Functions
// ========================
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => err ? reject(err) : resolve());
  });
}

function login() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ username: 'admin', password: 'admin' });
    const req = http.request(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).accessToken); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

function measureGet(urlPath, token) {
  return new Promise((resolve) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const start = Date.now();
    const req = http.request(`${BASE}${urlPath}`, { method: 'GET', headers }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(Date.now() - start));
    });
    req.on('error', () => resolve(-1));
    req.end();
  });
}

// ========================
// Main
// ========================
async function main() {
  const mode = process.argv[2] || 'all';

  if (mode === 'seed' || mode === 'all') {
    await seed();
  }

  if (mode === 'bench' || mode === 'all') {
    await benchmark();
  }

  db.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
