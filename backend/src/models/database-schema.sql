-- Solar Dashboard Database Schema (SQLite)
-- ใช้ init-db.cjs สำหรับสร้างตารางจริง
-- ไฟล์นี้เป็น reference สำหรับ developers
-- Sync กับ init-db.cjs แล้ว (2026-05-13)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'engineer', -- 'admin', 'engineer', 'staff', 'client'
  permissions TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_code TEXT UNIQUE NOT NULL,
  size_kw REAL NOT NULL,
  size_kva REAL,
  province TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'waiting', 'blocked', 'rejected', 'completed'
  current_step TEXT NOT NULL DEFAULT 'survey', -- 'survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'
  scope_start TEXT NOT NULL DEFAULT 'survey',
  scope_end TEXT NOT NULL DEFAULT 'cod',
  responsible_user TEXT REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  has_power_selling INTEGER DEFAULT 0, -- 0=false, 1=true
  requires_permit INTEGER, -- 0=false, 1=true
  permit_type TEXT, -- 'exemption', 'permit'
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
);

-- Organizations Table (หน่วยงาน)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  org_name TEXT NOT NULL UNIQUE,
  org_type TEXT NOT NULL, -- 'erc', 'pea', 'mea', 'tambon', 'municipal', 'factory', 'industrial'
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Steps Table (ขั้นตอนงาน)
CREATE TABLE IF NOT EXISTS project_steps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL, -- 'survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  start_date DATETIME,
  end_date DATETIME,
  responsible_org TEXT REFERENCES organizations(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'sld', 'permit', 'test_report', 'other'
  file_path TEXT,
  file_size INTEGER,
  upload_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  validation_status TEXT DEFAULT 'pending',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Project Organization Relations (ความเกี่ยวข้องระหว่างโครงการและหน่วยงาน)
CREATE TABLE IF NOT EXISTS project_organizations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_at DATETIME,
  approved_by TEXT REFERENCES users(id),
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Timeline Table (ประวัติการเปลี่ยน step/status)
CREATE TABLE IF NOT EXISTS project_timeline (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table (บันทึกกิจกรรมผู้ใช้)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  severity TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table (ระบบงาน/TODO)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date DATETIME,
  completed_at DATETIME,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table (ระบบแจ้งเตือน)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER DEFAULT 0, -- 0=unread, 1=read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens Table (ระบบ refresh token สำหรับ auth)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Checkpoints Table (จุดตรวจสอบแต่ละ step)
CREATE TABLE IF NOT EXISTS checkpoints (
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
);

-- Checkpoint Logs Table (ประวัติการตรวจสอบ)
CREATE TABLE IF NOT EXISTS checkpoint_logs (
  id TEXT PRIMARY KEY,
  checkpoint_id TEXT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Timeline Comments Table (คอมเมนต์แต่ละ Timeline)
CREATE TABLE IF NOT EXISTS timeline_comments (
  id TEXT PRIMARY KEY,
  timeline_id TEXT NOT NULL REFERENCES project_timeline(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Company Settings Table (ข้อมูลบริษัท - key-value)
CREATE TABLE IF NOT EXISTS company_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quotations Table (ใบเสนอราคา)
CREATE TABLE IF NOT EXISTS quotations (
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
);

-- Quotation Items Table (รายการในใบเสนอราคา)
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ชุด',
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Contracts Table (สัญญา)
CREATE TABLE IF NOT EXISTS contracts (
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_current_step ON projects(current_step);
CREATE INDEX IF NOT EXISTS idx_projects_province ON projects(province);
CREATE INDEX IF NOT EXISTS idx_projects_responsible_user ON projects(responsible_user);
CREATE INDEX IF NOT EXISTS idx_project_steps_project_id ON project_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_project_organizations_org_id ON project_organizations(org_id);
CREATE INDEX IF NOT EXISTS idx_project_organizations_composite ON project_organizations(project_id, org_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_project_id ON project_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_checkpoints_project_id ON checkpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_step ON checkpoints(step);
CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON checkpoints(status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_logs_checkpoint_id ON checkpoint_logs(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON projects(risk_level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_project_organizations_approval ON project_organizations(approval_status);
CREATE INDEX IF NOT EXISTS idx_timeline_comments_timeline_id ON timeline_comments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
