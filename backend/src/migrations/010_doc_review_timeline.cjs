/**
 * Migration 010: Doc Review Timeline
 * สร้างตาราง timeline สำหรับบันทึกประวัติการดำเนินงาน
 */

const up = `
-- ============================================================
-- doc_review_timeline - ประวัติการดำเนินงาน
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_review_timeline (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES doc_review_checklists(id) ON DELETE CASCADE,
  package_id TEXT REFERENCES doc_submission_packages(id),
  event_type TEXT NOT NULL,
  event_data TEXT,
  performed_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_review_timeline_checklist ON doc_review_timeline(checklist_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_timeline_created ON doc_review_timeline(created_at DESC);
`;

const down = `
DROP TABLE IF EXISTS doc_review_timeline;
`;

module.exports = { up, down };
