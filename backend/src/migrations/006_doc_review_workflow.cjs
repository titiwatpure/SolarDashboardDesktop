/**
 * Migration 006: Document Review & Agency Submission Tracking
 * ระบบตรวจเอกสารภายในและติดตามการยื่นหน่วยงาน
 */

const up = `
-- ============================================================
-- 1. doc_review_projects - โครงการที่ต้องยื่นเอกสาร
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_projects (
  id TEXT PRIMARY KEY,
  project_code TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_line TEXT,
  permit_type TEXT NOT NULL,
  agency TEXT,
  project_status TEXT DEFAULT 'waiting_documents',
  due_date DATE,
  owner_id TEXT REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. doc_review_checklists - รายการเอกสารที่ต้องตรวจ
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_checklists (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES doc_review_projects(id) ON DELETE CASCADE,
  checklist_template_id TEXT,
  document_name TEXT NOT NULL,
  description TEXT,
  is_required INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  latest_version INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. doc_review_files - ไฟล์เอกสารแต่ละ Version
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_files (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES doc_review_checklists(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  received_from TEXT,
  received_channel TEXT,
  received_date DATE,
  uploaded_by TEXT REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. doc_review_comments - คอมเมนต์ตรวจสอบ
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_comments (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES doc_review_checklists(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES doc_review_files(id),
  comment_type TEXT NOT NULL,
  reviewer_id TEXT REFERENCES users(id),
  review_status TEXT NOT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. doc_review_approvals - อนุมัติภายใน
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES doc_review_projects(id) ON DELETE CASCADE,
  approver_id TEXT REFERENCES users(id),
  approval_status TEXT NOT NULL,
  comment TEXT,
  approved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. doc_agency_submissions - การยื่นหน่วยงาน
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_agency_submissions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES doc_review_projects(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL,
  submission_round INTEGER DEFAULT 1,
  submitted_date DATE,
  agency_status TEXT DEFAULT 'pending',
  agency_comment TEXT,
  response_date DATE,
  next_action TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_doc_review_projects_status ON doc_review_projects(project_status);
CREATE INDEX IF NOT EXISTS idx_doc_review_projects_permit ON doc_review_projects(permit_type);
CREATE INDEX IF NOT EXISTS idx_doc_review_projects_due ON doc_review_projects(due_date);
CREATE INDEX IF NOT EXISTS idx_doc_review_projects_owner ON doc_review_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_checklists_project ON doc_review_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_checklists_status ON doc_review_checklists(status);
CREATE INDEX IF NOT EXISTS idx_doc_review_files_checklist ON doc_review_files(checklist_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_files_version ON doc_review_files(checklist_id, version);
CREATE INDEX IF NOT EXISTS idx_doc_review_comments_checklist ON doc_review_comments(checklist_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_comments_type ON doc_review_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_doc_review_approvals_project ON doc_review_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_agency_submissions_project ON doc_agency_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_agency_submissions_status ON doc_agency_submissions(agency_status);
`;

const down = `
DROP TABLE IF EXISTS doc_agency_submissions;
DROP TABLE IF EXISTS doc_review_approvals;
DROP TABLE IF EXISTS doc_review_comments;
DROP TABLE IF EXISTS doc_review_files;
DROP TABLE IF EXISTS doc_review_checklists;
DROP TABLE IF EXISTS doc_review_projects;
`;

module.exports = { up, down };
