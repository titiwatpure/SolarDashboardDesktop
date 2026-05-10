/**
 * Initialize SQLite Database
 * รัน: node src/init-db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath);

const initDB = async () => {
  console.log('⏳ กำลังสร้างตาราฐานข้อมูล...');

  const tables = [
    // Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'engineer',
      permissions TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Projects Table
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      project_code TEXT UNIQUE NOT NULL,
      size_kw REAL NOT NULL,
      size_kva REAL,
      province TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      current_step TEXT NOT NULL DEFAULT 'survey',
      scope_start TEXT NOT NULL DEFAULT 'survey',
      scope_end TEXT NOT NULL DEFAULT 'cod',
      responsible_user TEXT REFERENCES users(id) ON DELETE SET NULL,
      description TEXT,
      has_power_selling INTEGER DEFAULT 0,
      requires_permit INTEGER,
      permit_type TEXT,
      start_date DATETIME,
      expected_cod_date DATETIME,
      actual_cod_date DATETIME,
      blocked_reason TEXT,
      blocked_date DATETIME,
      blocked_by TEXT,
      risk_level TEXT DEFAULT 'low',
      risk_factors TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Organizations Table
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      org_name TEXT NOT NULL UNIQUE,
      org_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Project Steps Table
    `CREATE TABLE IF NOT EXISTS project_steps (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      start_date DATETIME,
      end_date DATETIME,
      responsible_org TEXT REFERENCES organizations(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Documents Table
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      document_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      upload_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      validation_status TEXT DEFAULT 'pending',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );`,

    // Project Organizations Table
    `CREATE TABLE IF NOT EXISTS project_organizations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT,
      approval_status TEXT DEFAULT 'pending',
      approved_at DATETIME,
      approved_by TEXT REFERENCES users(id),
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Reports Table
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      report_name TEXT NOT NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Project Timeline Table — บันทึกประวัติการเปลี่ยน step/status
    `CREATE TABLE IF NOT EXISTS project_timeline (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Activity Logs Table — บันทึกกิจกรรมผู้ใช้
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      severity TEXT DEFAULT 'info',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Tasks Table — ระบบงาน/TODO สำหรับแต่ละโปรเจก
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      due_date DATETIME,
      completed_at DATETIME,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Notifications Table — ระบบแจ้งเตือน
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Refresh Tokens Table — ระบบ refresh token สำหรับ auth
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Checkpoints Table — จุดตรวจสอบแต่ละ step
    `CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      checkpoint_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      required INTEGER DEFAULT 1,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Checkpoint Logs Table — ประวัติการตรวจสอบ
    `CREATE TABLE IF NOT EXISTS checkpoint_logs (
      id TEXT PRIMARY KEY,
      checkpoint_id TEXT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      reason TEXT,
      performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Timeline Comments Table — คอมเมนต์แต่ละ Timeline
    `CREATE TABLE IF NOT EXISTS timeline_comments (
      id TEXT PRIMARY KEY,
      timeline_id TEXT NOT NULL REFERENCES project_timeline(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  // สร้าง indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);',
    'CREATE INDEX IF NOT EXISTS idx_projects_current_step ON projects(current_step);',
    'CREATE INDEX IF NOT EXISTS idx_projects_province ON projects(province);',
    'CREATE INDEX IF NOT EXISTS idx_projects_responsible_user ON projects(responsible_user);',
    'CREATE INDEX IF NOT EXISTS idx_project_steps_project_id ON project_steps(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
    'CREATE INDEX IF NOT EXISTS idx_project_organizations_org_id ON project_organizations(org_id);',
    'CREATE INDEX IF NOT EXISTS idx_project_organizations_composite ON project_organizations(project_id, org_id);',
    'CREATE INDEX IF NOT EXISTS idx_project_timeline_project_id ON project_timeline(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);',
    'CREATE INDEX IF NOT EXISTS idx_checkpoints_project_id ON checkpoints(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_checkpoints_step ON checkpoints(step);',
    'CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON checkpoints(status);',
    'CREATE INDEX IF NOT EXISTS idx_checkpoint_logs_checkpoint_id ON checkpoint_logs(checkpoint_id);',
    'CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON projects(risk_level);',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);',
    'CREATE INDEX IF NOT EXISTS idx_project_organizations_approval ON project_organizations(approval_status);',
    'CREATE INDEX IF NOT EXISTS idx_timeline_comments_timeline_id ON timeline_comments(timeline_id);'
  ];

  // Helper: wrap db.run ใน Promise
  const runSql = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // สร้างตาราทั้งหมด (sequential)
  for (const sql of tables) {
    try {
      await runSql(sql);
    } catch (err) {
      console.error('❌ Error:', err);
    }
  }

  // Migration: เพิ่มคอลัมน์ scope_start/scope_end สำหรับ database ที่มีอยู่แล้ว
  const migrations = [
    "ALTER TABLE projects ADD COLUMN scope_start TEXT NOT NULL DEFAULT 'survey'",
    "ALTER TABLE projects ADD COLUMN scope_end TEXT NOT NULL DEFAULT 'cod'",
  ];
  for (const sql of migrations) {
    try {
      await runSql(sql);
    } catch {
      // คอลัมน์มีอยู่แล้ว — ข้าม
    }
  }

  // สร้าง indexes (sequential)
  for (const sql of indexes) {
    try {
      await runSql(sql);
    } catch (err) {
      console.error('❌ Index Error:', err);
    }
  }

  // Seed data - เพิ่มผู้ใช้ demo
  console.log('⏳ กำลังเพิ่มข้อมูล demo...');

  // Helper: wrap db.run แบบ Promise สำหรับ INSERT
  const runInsert = (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin', 12);

    // สร้าง admin user หรือ reset password ถ้ามีอยู่แล้ว
    await runInsert(
      `INSERT OR IGNORE INTO users (id, username, email, password, full_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', 'admin@solardashboard.com', hashedPassword, 'Admin User', 'admin', 'active']
    );
    // Reset password ทุกครั้งที่ container เริ่มต้น
    await runInsert(
      `UPDATE users SET password = ? WHERE username = 'admin'`,
      [hashedPassword]
    );
    console.log('✅ เพิ่ม admin user สำเร็จ');

    // เพิ่ม demo users สำหรับ role อื่นๆ
    const demoUsers = [
      { username: 'engineer', email: 'engineer@solardashboard.com', full_name: 'Engineer User', role: 'engineer' },
      { username: 'staff', email: 'staff@solardashboard.com', full_name: 'Staff User', role: 'staff' },
      { username: 'client', email: 'client@solardashboard.com', full_name: 'Client User', role: 'client' },
    ];
    for (const u of demoUsers) {
      const id = uuidv4();
      const pw = await bcrypt.hash(u.username, 12);
      await runInsert(
        `INSERT OR IGNORE INTO users (id, username, email, password, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, u.username, u.email, pw, u.full_name, u.role, 'active']
      );
    }
    console.log('✅ เพิ่ม demo users (engineer/staff/client) สำเร็จ');

    // เพิ่มหน่วยงาน demo
    const orgs = [
      { id: uuidv4(), name: 'สำนักงานคณะกรรมการกำกับพลังงาน (กกพ.)', type: 'erc' },
      { id: uuidv4(), name: 'บริษัท การไฟฟ้าส่วนภูมิภาค (PEA)', type: 'pea' },
      { id: uuidv4(), name: 'บริษัท การไฟฟ้านครหลวง (MEA)', type: 'mea' },
      { id: uuidv4(), name: 'กรมโรงงานอุตสาหกรรม', type: 'factory' },
      { id: uuidv4(), name: 'การนิคมอุตสาหกรรมแห่งประเทศไทย', type: 'industrial' },
      { id: uuidv4(), name: 'เทศบาล', type: 'municipal' },
      { id: uuidv4(), name: 'องค์การบริหารส่วนตำบล (อบต.)', type: 'tambon' }
    ];

    for (const org of orgs) {
      await runInsert(
        `INSERT OR IGNORE INTO organizations (id, org_name, org_type, status) VALUES (?, ?, ?, ?)`,
        [org.id, org.name, org.type, 'active']
      );
    }
    console.log('✅ เพิ่มหน่วยงาน demo สำเร็จ');
  } catch (err) {
    console.error('❌ Error seeding data:', err);
  }

  // ปิด database หลังจากสร้างเสร็จ
  db.close(() => {
    console.log('✅ ฐานข้อมูล SQLite สร้างสำเร็จ!');
    console.log('📍 ตำแหน่ง:', dbPath);
    console.log('👤 ล็อกอินด้วย: admin / admin');
  });
};

initDB();
