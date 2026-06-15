const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database(path.join(__dirname, '..', 'solar_dashboard.db'));

const projects = {
  'SOL-2026-001': 'fcc02a72-c46e-4b1b-9f0e-f12a08d01dc7',
  'SOL-2026-002': '987631fb-47dc-4099-b79f-a173bfc466a2',
  'SOL-2026-003': 'b3655046-fa95-4e03-8c46-c7b8db9eb7d4',
  'SOL-2026-004': '45f8d25b-7dde-477a-95b0-0dac1229ef24',
};
const users = {
  admin: 'a1bfdc96-bd91-46ef-9283-8f7eaec7cac7',
  engineer: 'fff2c4c8-2fa8-4f9e-9dbd-af17e34c4842',
  staff: '4af55d6e-3e92-46eb-b526-aee030362f1a',
};

const today = new Date('2026-06-15');
const fmt = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const tasks = [
  { title: 'ตรวจแบบ Solar', due: addDays(today,0), status:'in_progress', priority:'high', proj:'SOL-2026-001', assign:'engineer', desc:'ตรวจสอบแบบ Solar Rooftop ก่อนส่ง PEA' },
  { title: 'ส่งเอกสาร PEA', due: addDays(today,1), status:'pending', priority:'urgent', proj:'SOL-2026-002', assign:'staff', desc:'จัดส่งเอกสารขอต่อสายให้ PEA ภูเก็ต' },
  { title: 'นัดสำรวจหน้างาน', due: addDays(today,3), status:'pending', priority:'medium', proj:'SOL-2026-003', assign:'engineer', desc:'นัดวิศวกรเข้าสำรวจหน้างานวิทยาลัย' },
  { title: 'ติดตามใบอนุญาต ERC', due: addDays(today,-5), status:'in_progress', priority:'urgent', proj:'SOL-2026-001', assign:'admin', desc:'ติดตามสถานะใบอนุญาตจาก กกพ.' },
  { title: 'ประชุมลูกค้า', due: addDays(today,5), status:'pending', priority:'medium', proj:'SOL-2026-004', assign:'admin', desc:'ประชุมสรุปแผนงานกับลูกค้าฟาร์มโคนม' },
  { title: 'อัปเดตรายงานโครงการ', due: addDays(today,-3), status:'completed', priority:'high', proj:'SOL-2026-002', assign:'engineer', desc:'อัปเดตสถานะโครงการในรายงานประจำสัปดาห์' },
  { title: 'จัดทำ BOQ โครงการ', due: addDays(today,6), status:'pending', priority:'low', proj:'SOL-2026-003', assign:'staff', desc:'จัดทำใบเสนอราคา BOQ สำหรับโครงการวิทยาลัย' },
  { title: 'ตรวจสอบแบบไฟฟ้า', due: null, status:'pending', priority:'medium', proj:'SOL-2026-001', assign:'engineer', desc:'ตรวจสอบแบบ Single Line Diagram' },
  { title: 'เตรียมเอกสารขอเชื่อมต่อ', due: null, status:'in_progress', priority:'high', proj:'SOL-2026-004', assign:'admin', desc:'เตรียมเอกสารยื่นขอเชื่อมต่อระบบไฟฟ้า' },
  { title: 'ตรวจความครบถ้วนเอกสาร', due: addDays(today,2), status:'completed', priority:'low', proj:'SOL-2026-003', assign:'staff', desc:'ตรวจเอกสารประกอบการยื่นขออนุญาต' },
  { title: 'วางแผนติดตั้งโซลาร์', due: addDays(today,4), status:'in_progress', priority:'medium', proj:'SOL-2026-002', assign:'engineer', desc:'วางแผนขั้นตอนการติดตั้งแผงโซลาร์' },
  { title: 'จัดส่งวัสดุเข้าไซต์', due: null, status:'pending', priority:'urgent', proj:'SOL-2026-001', assign:'staff', desc:'จัดส่งอุปกรณ์และวัสดุก่อสร้างเข้าหน้างาน' },
];

let done = 0;
tasks.forEach(t => {
  const sql = 'INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.run(sql, [
    uuidv4(), projects[t.proj], t.title, t.desc, t.status, t.priority,
    users[t.assign], t.due ? fmt(t.due) : null, users.admin
  ], function(err) {
    if (err) { console.error('ERR:', t.title, err.message); }
    else { console.log('OK:', t.title, t.due ? fmt(t.due) : '(no due)', t.status, t.priority); }
    done++;
    if (done === tasks.length) db.close();
  });
});
