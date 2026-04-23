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
      status TEXT NOT NULL DEFAULT 'pending',
      current_step TEXT NOT NULL DEFAULT 'survey',
      responsible_user TEXT REFERENCES users(id),
      description TEXT,
      has_power_selling INTEGER DEFAULT 0,
      requires_permit INTEGER,
      permit_type TEXT,
      start_date DATETIME,
      expected_cod_date DATETIME,
      actual_cod_date DATETIME,
      blocked_reason TEXT,
      blocked_date DATETIME,
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
      upload_by TEXT REFERENCES users(id),
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );`,

    // Project Organizations Table
    `CREATE TABLE IF NOT EXISTS project_organizations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Reports Table
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      report_name TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  // สร้างตาราทั้งหมด
  for (const sql of tables) {
    db.run(sql, (err) => {
      if (err) console.error('❌ Error:', err);
    });
  }

  // Seed data - เพิ่มผู้ใช้ demo
  console.log('⏳ กำลังเพิ่มข้อมูล demo...');
  
  try {
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    db.run(
      `INSERT OR IGNORE INTO users (id, username, email, password, full_name, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', 'admin@solardashboard.com', hashedPassword, 'Admin User', 'admin', 'active'],
      (err) => {
        if (err) console.error('❌ Error inserting admin:', err);
        else console.log('✅ เพิ่ม admin user สำเร็จ');
      }
    );

    // เพิ่มหน่วยงาน demo
    const orgs = [
      { id: uuidv4(), name: 'สำนักกลั่นกำลังไฟฟ้า (กกพ.)', type: 'erc' },
      { id: uuidv4(), name: 'บริษัท การไฟฟ้าส่วนภูมิภาค (PEA)', type: 'pea' },
      { id: uuidv4(), name: 'บริษัท การไฟฟ้านครหลวง (MEA)', type: 'mea' }
    ];

    orgs.forEach(org => {
      db.run(
        `INSERT OR IGNORE INTO organizations (id, org_name, org_type, status) VALUES (?, ?, ?, ?)`,
        [org.id, org.name, org.type, 'active']
      );
    });

    console.log('✅ เพิ่มหน่วยงาน demo สำเร็จ');
  } catch (err) {
    console.error('❌ Error seeding data:', err);
  }

  // ปิด database หลังจากสร้างเสร็จ
  setTimeout(() => {
    db.close(() => {
      console.log('✅ ฐานข้อมูล SQLite สร้างสำเร็จ!');
      console.log('📍 ตำแหน่ง:', dbPath);
      console.log('👤 ล็อกอินด้วย: admin / admin');
    });
  }, 1000);
};

initDB();
