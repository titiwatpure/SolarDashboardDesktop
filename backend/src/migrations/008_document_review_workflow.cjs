/**
 * Migration 008: Document Review Workflow
 * สร้างตารางใหม่สำหรับระบบตรวจเอกสารและยื่นหน่วยงาน
 */

const up = `
-- ============================================================
-- 1. document_receipts - บันทึกการรับเอกสารจากลูกค้า
-- ============================================================
CREATE TABLE IF NOT EXISTS document_receipts (
  id TEXT PRIMARY KEY,
  checklist_item_id TEXT NOT NULL REFERENCES doc_review_checklists(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES doc_submission_packages(id) ON DELETE CASCADE,
  received_from TEXT,
  received_channel TEXT CHECK(received_channel IN ('line', 'email', 'drive', 'paper', 'other')),
  received_date DATE,
  revision_round INTEGER DEFAULT 1,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. document_issues - ปัญหาที่ต้องแก้ไข
-- ============================================================
CREATE TABLE IF NOT EXISTS document_issues (
  id TEXT PRIMARY KEY,
  checklist_item_id TEXT NOT NULL REFERENCES doc_review_checklists(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES doc_submission_packages(id) ON DELETE CASCADE,
  issue_source TEXT NOT NULL CHECK(issue_source IN ('internal', 'agency')),
  description TEXT NOT NULL,
  required_action TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
  revision_round INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- ============================================================
-- 3. correction_reports - รายงานส่งลูกค้า
-- ============================================================
CREATE TABLE IF NOT EXISTS correction_reports (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES doc_submission_packages(id) ON DELETE CASCADE,
  issues TEXT, -- JSON array of issue IDs
  exported_format TEXT CHECK(exported_format IN ('pdf', 'excel')),
  exported_at DATETIME,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_receipts_checklist ON document_receipts(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_receipts_package ON document_receipts(package_id);
CREATE INDEX IF NOT EXISTS idx_receipts_revision ON document_receipts(revision_round);
CREATE INDEX IF NOT EXISTS idx_issues_checklist ON document_issues(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_issues_package ON document_issues(package_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON document_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_source ON document_issues(issue_source);
CREATE INDEX IF NOT EXISTS idx_correction_package ON correction_reports(package_id);
`;

const down = `
DROP TABLE IF EXISTS correction_reports;
DROP TABLE IF EXISTS document_issues;
DROP TABLE IF EXISTS document_receipts;
`;

module.exports = { up, down };
