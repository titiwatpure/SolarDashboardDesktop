/**
 * Migration 007: Add Submission Packages Layer
 * เพิ่มชั้น submission_packages สำหรับ 1 โครงการมีหลายชุดเอกสาร
 */

const up = `
-- ============================================================
-- 1. doc_submission_packages - ชุดเอกสารที่ต้องยื่น
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_submission_packages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES doc_review_projects(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,              -- "พค.2 ใบอนุญาตผลิตพลังงานควบคุม"
  permit_type TEXT NOT NULL,              -- pck2, a1, erc, rong4, sld
  agency TEXT,                            -- กกพ./พพ., เทศบาล, กรมโรงงานฯ, PEA/MEA
  package_status TEXT DEFAULT 'waiting_documents',
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. เพิ่ม package_id ใน doc_review_checklists
-- ============================================================
ALTER TABLE doc_review_checklists ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE;

-- ============================================================
-- 3. เพิ่ม package_id ใน doc_agency_submissions
-- ============================================================
ALTER TABLE doc_agency_submissions ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE;

-- ============================================================
-- 4. เพิ่ม package_id ใน doc_review_approvals
-- ============================================================
ALTER TABLE doc_review_approvals ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_doc_submission_packages_project ON doc_submission_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_submission_packages_status ON doc_submission_packages(package_status);
CREATE INDEX IF NOT EXISTS idx_doc_review_checklists_package ON doc_review_checklists(package_id);
CREATE INDEX IF NOT EXISTS idx_doc_agency_submissions_package ON doc_agency_submissions(package_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_approvals_package ON doc_review_approvals(package_id);
`;

const down = `
DROP TABLE IF EXISTS doc_submission_packages;
`;

module.exports = { up, down };
