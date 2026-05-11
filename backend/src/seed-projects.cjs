const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const seed = async () => {
  console.log('⏳ กำลังสร้างข้อมูลตัวอย่าง...');

  // ดึง user IDs
  const admin = await get('SELECT id FROM users WHERE username = ?', ['admin']);
  const engineer = await get('SELECT id FROM users WHERE username = ?', ['engineer']);
  const staff = await get('SELECT id FROM users WHERE username = ?', ['staff']);

  // ดึง organization IDs
  const pea = await get('SELECT id FROM organizations WHERE org_type = ?', ['pea']);
  const mea = await get('SELECT id FROM organizations WHERE org_type = ?', ['mea']);
  const erc = await get('SELECT id FROM organizations WHERE org_type = ?', ['erc']);
  const municipal = await get('SELECT id FROM organizations WHERE org_type = ?', ['municipal']);

  if (!admin || !engineer) {
    console.error('❌ ไม่พบ users กรุณารัน init-db.cjs ก่อน');
    db.close();
    return;
  }

  const projects = [
    {
      id: uuidv4(),
      name: 'Solar Rooftop โรงงาน ABC ชลบุรี',
      code: 'SOL-2026-001',
      size_kw: 500,
      size_kva: 625,
      province: 'ชลบุรี',
      status: 'in_progress',
      current_step: 'erc',
      responsible: engineer.id,
      description: 'โครงการติดตั้ง Solar Rooftop บนหลังคาโรงงานผลิตชิ้นส่วนยนต์ ขนาด 500 kW',
      has_power_selling: 1,
      requires_permit: 1,
      permit_type: 'permit',
      start_date: '2026-01-15',
      expected_cod_date: '2026-08-30',
      risk_level: 'medium',
      risk_factors: JSON.stringify({ delay_days: 0, blocked_days: 0, failed_checkpoints: 1, overdue_tasks: 2 }),
      orgs: [pea, erc],
    },
    {
      id: uuidv4(),
      name: 'Solar โรงแรม XYZ ภูเก็ต',
      code: 'SOL-2026-002',
      size_kw: 200,
      size_kva: 250,
      province: 'ภูเก็ต',
      status: 'blocked',
      current_step: 'grid',
      responsible: engineer.id,
      description: 'ติดตั้ง Solar บนหลังคาโรงแรม 5 ชั้น ขนาด 200 kW สำหรับใช้ภายในโรงแรม',
      has_power_selling: 0,
      requires_permit: 1,
      permit_type: 'exemption',
      start_date: '2026-02-01',
      expected_cod_date: '2026-07-15',
      blocked_reason: 'รอ PEA อนุมัติแผนการต่อสายเข้าระบบจำหน่าย',
      blocked_date: '2026-04-20',
      blocked_by: 'PEA ภูเก็ต',
      risk_level: 'high',
      risk_factors: JSON.stringify({ delay_days: 5, blocked_days: 18, failed_checkpoints: 0, overdue_tasks: 1 }),
      orgs: [pea],
    },
    {
      id: uuidv4(),
      name: 'Solar วิทยาลัยเทคนิคกรุงเทพ',
      code: 'SOL-2026-003',
      size_kw: 100,
      size_kva: 125,
      province: 'กรุงเทพมหานคร',
      status: 'waiting',
      current_step: 'testing',
      responsible: staff.id,
      description: 'โครงการติดตั้ง Solar บนหลังคาอาคารเรียน ขนาด 100 kW เพื่อการศึกษาและประหยัดพลังงาน',
      has_power_selling: 0,
      requires_permit: 1,
      permit_type: 'exemption',
      start_date: '2025-11-01',
      expected_cod_date: '2026-05-30',
      risk_level: 'low',
      risk_factors: JSON.stringify({ delay_days: 0, blocked_days: 0, failed_checkpoints: 0, overdue_tasks: 0 }),
      orgs: [mea],
    },
    {
      id: uuidv4(),
      name: 'Solar ฟาร์มโคนม นครราชสีมา',
      code: 'SOL-2026-004',
      size_kw: 50,
      size_kva: 62.5,
      province: 'นครราชสีมา',
      status: 'not_started',
      current_step: 'survey',
      responsible: admin.id,
      description: 'ติดตั้ง Solar บนหลังคาโรงเรือนฟาร์มโคนม ขนาด 50 kW สำหรับใช้ในฟาร์ม',
      has_power_selling: 0,
      requires_permit: 1,
      permit_type: 'exemption',
      start_date: '2026-06-01',
      expected_cod_date: '2026-12-31',
      risk_level: 'low',
      risk_factors: JSON.stringify({}),
      orgs: [municipal],
    },
  ];

  for (const p of projects) {
    await run(
      `INSERT INTO projects (id, project_name, project_code, size_kw, size_kva, province, status, current_step,
        responsible_user, description, has_power_selling, requires_permit, permit_type, start_date, expected_cod_date,
        blocked_reason, blocked_date, blocked_by, risk_level, risk_factors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.code, p.size_kw, p.size_kva, p.province, p.status, p.current_step,
       p.responsible, p.description, p.has_power_selling, p.requires_permit, p.permit_type,
       p.start_date, p.expected_cod_date, p.blocked_reason || null, p.blocked_date || null,
       p.blocked_by || null, p.risk_level, p.risk_factors]
    );

    // เชื่อม organizations
    for (const org of p.orgs) {
      if (!org) continue;
      await run(
        `INSERT INTO project_organizations (id, project_id, org_id, role, approval_status) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), p.id, org.id, org.org_type === 'erc' ? 'อนุมัติ' : 'ตรวจสอบ', p.status === 'blocked' ? 'pending' : 'approved']
      );
    }

    // สร้าง timeline
    await run(
      `INSERT INTO project_timeline (id, project_id, step, status, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), p.id, p.current_step, p.status, 'สร้างโครงการตัวอย่าง', p.responsible]
    );

    // สร้าง tasks ตัวอย่าง
    const taskDefs = [
      { title: 'สำรวจพื้นที่', priority: 'high', status: p.current_step !== 'survey' ? 'completed' : 'pending' },
      { title: 'ยื่นเอกสารขออนุญาต', priority: 'urgent', status: p.status === 'blocked' ? 'in_progress' : 'pending' },
      { title: 'จัดซื้อแผง Solar', priority: 'medium', status: 'pending' },
    ];
    for (const t of taskDefs) {
      await run(
        `INSERT INTO tasks (id, project_id, title, status, priority, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), p.id, t.title, t.status, t.priority, p.responsible, admin.id]
      );
    }

    // สร้าง checkpoints ตาม step ปัจจุบัน
    const checkpointDefs = {
      survey: ['สำรวจพื้นที่', 'ตรวจสอบโครงสร้างหลังคา'],
      design: ['ออกแบบ SLD', 'คำนวณขนาดระบบ'],
      erc: ['ยื่นเอกสาร กกพ.', 'ได้รับหนังสืออนุมัติ'],
      grid: ['ยื่นขอต่อสาย PEA/MEA', 'ได้รับอนุมัติต่อสาย'],
      construction: ['ติดตั้งโครงสร้าง', 'ติดตั้งแผงโซลาร์'],
      testing: ['ทดสอบระบบ', 'ตรวจสอบความปลอดภัย'],
      cod: ['ส่งมอบงาน', 'อบรมการใช้งาน'],
    };

    const cps = checkpointDefs[p.current_step] || [];
    for (let i = 0; i < cps.length; i++) {
      const cpId = uuidv4();
      const cpStatus = i === 0 && p.status === 'in_progress' ? 'passed' : (i === 1 && p.status === 'waiting' ? 'pending' : 'pending');
      await run(
        `INSERT INTO checkpoints (id, project_id, step, checkpoint_name, status, required, assigned_to) VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [cpId, p.id, p.current_step, cps[i], cpStatus, p.responsible]
      );
      await run(
        `INSERT INTO checkpoint_logs (id, checkpoint_id, action, new_status, reason, performed_by) VALUES (?, ?, 'created', ?, 'Seed data', ?)`,
        [uuidv4(), cpId, cpStatus, admin.id]
      );
    }

    // สร้าง documents ตัวอย่าง
    const docTypes = ['sld', 'permit', 'test_report'];
    for (const dt of docTypes) {
      await run(
        `INSERT INTO documents (id, project_id, document_name, document_type, upload_by, validation_status) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), p.id, `${dt.toUpperCase()}_${p.code}`, dt, p.responsible, dt === 'sld' ? 'validated' : 'pending']
      );
    }

    console.log(`✅ สร้างโครงการ: ${p.name} (${p.code}) — ${p.status}/${p.current_step}`);
  }

  // สร้าง notifications ตัวอย่าง
  const proj2 = projects[1]; // blocked project
  await run(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), engineer.id, 'status_change', 'โครงการติดปัญหา',
     `โครงการ "${proj2.name}" ติดปัญหาที่ขั้นตอน Grid — ${proj2.blocked_reason}`,
     'project', proj2.id]
  );

  console.log('✅ สร้างข้อมูลตัวอย่างเสร็จสิ้น!');
  console.log(`📊 สร้าง ${projects.length} โครงการ พร้อม tasks, checkpoints, documents, notifications`);
  db.close();
};

seed();
