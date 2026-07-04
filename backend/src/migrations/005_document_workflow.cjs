/**
 * Migration 005: Document Workflow System
 * สร้างตารางสำหรับระบบจัดการเอกสารยื่นขออนุญาต
 */

const up = `
-- ============================================================
-- 1. document_checklists - เช็คลิสต์สำหรับแต่ละประเภทใบอนุญาต
-- ============================================================
CREATE TABLE IF NOT EXISTS document_checklists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permit_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  agency TEXT,
  source TEXT,
  is_template INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. checklist_items - รายการในเช็คลิสต์
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES document_checklists(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. document_requests - รายการเอกสารที่ต้องการสำหรับแต่ละโครงการ
-- ============================================================
CREATE TABLE IF NOT EXISTS document_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_id TEXT REFERENCES document_checklists(id),
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  agency TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  current_version INTEGER DEFAULT 0,
  assigned_to TEXT REFERENCES users(id),
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. document_submissions - การส่งเอกสารแต่ละ version
-- ============================================================
CREATE TABLE IF NOT EXISTS document_submissions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  document_id TEXT REFERENCES documents(id),
  submitted_by TEXT REFERENCES users(id),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending_review',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. document_reviews - ผลการตรวจสอบ
-- ============================================================
CREATE TABLE IF NOT EXISTS document_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES document_submissions(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL,
  reviewer_id TEXT REFERENCES users(id),
  status TEXT NOT NULL,
  comments TEXT,
  checklist_results TEXT,
  agency_comment TEXT,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. document_comment_sheets - Comment Sheet สำหรับส่งลูกค้า
-- ============================================================
CREATE TABLE IF NOT EXISTS document_comment_sheets (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES document_submissions(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'draft',
  sent_via TEXT,
  sent_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. comment_items - รายการคอมเม้นแต่ละข้อ
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_items (
  id TEXT PRIMARY KEY,
  comment_sheet_id TEXT NOT NULL REFERENCES document_comment_sheets(id) ON DELETE CASCADE,
  checklist_item_id TEXT REFERENCES checklist_items(id),
  item_order INTEGER NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  required_action TEXT,
  status TEXT DEFAULT 'pending',
  fixed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_checklists_permit_type ON document_checklists(permit_type);
CREATE INDEX IF NOT EXISTS idx_checklists_is_template ON document_checklists(is_template);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_project_id ON document_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_doc_requests_due_date ON document_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_doc_submissions_request_id ON document_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_doc_submissions_status ON document_submissions(status);
CREATE INDEX IF NOT EXISTS idx_doc_reviews_submission_id ON document_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_comment_sheets_submission_id ON document_comment_sheets(submission_id);
CREATE INDEX IF NOT EXISTS idx_comment_items_sheet_id ON comment_items(comment_sheet_id);
`;

const down = `
DROP TABLE IF EXISTS comment_items;
DROP TABLE IF EXISTS document_comment_sheets;
DROP TABLE IF EXISTS document_reviews;
DROP TABLE IF EXISTS document_submissions;
DROP TABLE IF EXISTS document_requests;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS document_checklists;
`;

module.exports = { up, down };
