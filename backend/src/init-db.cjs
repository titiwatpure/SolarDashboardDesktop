/**
 * Initialize SQLite Database
 * รัน: node src/init-db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'solar_dashboard.db');
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
      phone TEXT,
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
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      site_address TEXT,
      site_lat REAL,
      site_lng REAL,
      grid_station TEXT,
      grid_voltage TEXT,
      contract_number TEXT,
      contract_value REAL,
      contract_date TEXT,
      budget REAL,
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
      start_date DATE,
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
    );`,

    // Customers Table — ข้อมูลลูกค้า
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_type TEXT, -- 'individual', 'company', 'government'
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      tax_id TEXT,
      address TEXT,
      notes TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Project Specs Table — สเปคเทคนิค (1:1 กับ project)
    `CREATE TABLE IF NOT EXISTS project_specs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
      panel_brand TEXT,
      panel_model TEXT,
      panel_count INTEGER,
      inverter_brand TEXT,
      inverter_model TEXT,
      inverter_count INTEGER,
      mounting_type TEXT, -- 'roof', 'ground', 'floating'
      grid_connection_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Company Settings Table — ข้อมูลบริษัท (key-value)
    `CREATE TABLE IF NOT EXISTS company_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Quotations Table — ใบเสนอราคา
    `CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      quote_number TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft/sent/approved/rejected/expired
      valid_until DATE,
      subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 7,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Quotation Items Table — รายการในใบเสนอราคา
    `CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'ชุด',
      unit_price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );`,

    // Contracts Table — สัญญา
    `CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      project_id TEXT UNIQUE REFERENCES projects(id) ON DELETE SET NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      contract_number TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- draft/active/completed/terminated
      start_date DATE,
      end_date DATE,
      total_value REAL,
      signed_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Accounting Categories Table — หมวดหมู่บัญชี
    `CREATE TABLE IF NOT EXISTS accounting_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- income / expense
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );`,

    // Transactions Table — รายการบัญชี
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES accounting_categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL, -- income / expense
      amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      transaction_date DATE NOT NULL,
      reference_type TEXT, -- contract / quotation / manual
      reference_id TEXT,
      payment_method TEXT, -- cash / transfer / check / other
      receipt_number TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Payment Installments Table — งวดชำระ
    `CREATE TABLE IF NOT EXISTS payment_installments (
      id TEXT PRIMARY KEY,
      contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'pending', -- pending / paid / partial / overdue
      paid_amount REAL DEFAULT 0,
      paid_date DATE,
      transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
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
    'CREATE INDEX IF NOT EXISTS idx_timeline_comments_timeline_id ON timeline_comments(timeline_id);',
    'CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_project_specs_project_id ON project_specs(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);',
    'CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);',
    'CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);',
    'CREATE INDEX IF NOT EXISTS idx_installments_project_id ON payment_installments(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_installments_contract_id ON payment_installments(contract_id);',
    'CREATE INDEX IF NOT EXISTS idx_installments_status ON payment_installments(status);',
    // Composite indexes สำหรับ report queries
    'CREATE INDEX IF NOT EXISTS idx_projects_status_step ON projects(status, current_step);',
    'CREATE INDEX IF NOT EXISTS idx_projects_risk_status ON projects(risk_level, status);',
    'CREATE INDEX IF NOT EXISTS idx_projects_province_status ON projects(province, status);',
    'CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(responsible_user, status);',
    'CREATE INDEX IF NOT EXISTS idx_timeline_project_step_time ON project_timeline(project_id, step, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON tasks(priority, status);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_proj_type_date ON transactions(project_id, type, transaction_date);',
    'CREATE INDEX IF NOT EXISTS idx_activity_entity_time ON activity_logs(entity_type, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read_time ON notifications(is_read, created_at);'
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

  // Migration: เพิ่มคอลัมน์ใหม่สำหรับ database ที่มีอยู่แล้ว
  const { runMigrations } = require('./migrations/runner.cjs');
  await runMigrations(db);

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
    const hashedPassword = await bcrypt.hash('admin', 10);

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
      const pw = await bcrypt.hash(u.username, 10);
      await runInsert(
        `INSERT OR IGNORE INTO users (id, username, email, password, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, u.username, u.email, pw, u.full_name, u.role, 'active']
      );
    }
    console.log('✅ เพิ่ม demo users (engineer/staff/client) สำเร็จ');

    // เพิ่มหน่วยงาน demo
    const orgs = [
      { name: 'สำนักงานคณะกรรมการกำกับพลังงาน (กกพ.)', type: 'erc' },
      { name: 'บริษัท การไฟฟ้าส่วนภูมิภาค (PEA)', type: 'pea' },
      { name: 'บริษัท การไฟฟ้านครหลวง (MEA)', type: 'mea' },
      { name: 'กรมโรงงานอุตสาหกรรม', type: 'factory' },
      { name: 'การนิคมอุตสาหกรรมแห่งประเทศไทย', type: 'industrial' },
      { name: 'เทศบาล', type: 'municipal' },
      { name: 'องค์การบริหารส่วนตำบล (อบต.)', type: 'tambon' }
    ];

    for (const org of orgs) {
      const existing = await new Promise((resolve, reject) => {
        db.all('SELECT id FROM organizations WHERE org_name = ?', [org.name], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
      if (existing.length === 0) {
        await runInsert(
          'INSERT INTO organizations (id, org_name, org_type, status) VALUES (?, ?, ?, ?)',
          [uuidv4(), org.name, org.type, 'active']
        );
      }
    }
    console.log('✅ เพิ่มหน่วยงาน demo สำเร็จ');

    // เพิ่มหมวดหมู่บัญชีเริ่มต้น (ใช้ชื่อเป็น unique key เพื่อไม่ให้ซ้ำ)
    const categories = [
      { name: 'เงินมัดจำ', type: 'income', icon: '💰', sort: 1 },
      { name: 'งวดระหว่างงาน', type: 'income', icon: '💵', sort: 2 },
      { name: 'งวดส่งมอบ', type: 'income', icon: '✅', sort: 3 },
      { name: 'รายรับอื่นๆ', type: 'income', icon: '📋', sort: 4 },
      { name: 'ค่าวัสดุ', type: 'expense', icon: '🔩', sort: 1 },
      { name: 'ค่าแรง', type: 'expense', icon: '👷', sort: 2 },
      { name: 'ค่าดำเนินการ', type: 'expense', icon: '📄', sort: 3 },
      { name: 'ค่าเดินทาง', type: 'expense', icon: '🚗', sort: 4 },
      { name: 'ค่าใช้จ่ายอื่นๆ', type: 'expense', icon: '📦', sort: 5 },
    ];
    for (const cat of categories) {
      const existing = await new Promise((resolve, reject) => {
        db.all('SELECT id FROM accounting_categories WHERE name = ? AND type = ?', [cat.name, cat.type], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
      if (existing.length === 0) {
        await runInsert(
          'INSERT INTO accounting_categories (id, name, type, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), cat.name, cat.type, cat.icon, cat.sort]
        );
      }
    }
    console.log('✅ เพิ่มหมวดหมู่บัญชีสำเร็จ');
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

if (require.main === module) {
  initDB();
}
module.exports = { initDB };
