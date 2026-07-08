/**
 * Migration 007: Add Submission Packages Layer
 * เพิ่มชั้น submission_packages สำหรับ 1 โครงการมีหลายชุดเอกสาร
 * ใช้ try-catch สำหรับ ALTER TABLE เพื่อรองรับ DB ที่ run ไปแล้วบางส่วน
 */

async function up(runSql) {
  // 1. สร้าง doc_submission_packages
  await runSql(`
    CREATE TABLE IF NOT EXISTS doc_submission_packages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES doc_review_projects(id) ON DELETE CASCADE,
      package_name TEXT NOT NULL,
      permit_type TEXT NOT NULL,
      agency TEXT,
      package_status TEXT DEFAULT 'waiting_documents',
      due_date DATE,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2-4. เพิ่ม package_id columns (try-catch: ถ้า column มีอยู่แล้วจะข้ามไป)
  try {
    await runSql("ALTER TABLE doc_review_checklists ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  try {
    await runSql("ALTER TABLE doc_agency_submissions ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  try {
    await runSql("ALTER TABLE doc_review_approvals ADD COLUMN package_id TEXT REFERENCES doc_submission_packages(id) ON DELETE CASCADE");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  // Indexes
  await runSql("CREATE INDEX IF NOT EXISTS idx_doc_submission_packages_project ON doc_submission_packages(project_id)");
  await runSql("CREATE INDEX IF NOT EXISTS idx_doc_submission_packages_status ON doc_submission_packages(package_status)");
  await runSql("CREATE INDEX IF NOT EXISTS idx_doc_review_checklists_package ON doc_review_checklists(package_id)");
  await runSql("CREATE INDEX IF NOT EXISTS idx_doc_agency_submissions_package ON doc_agency_submissions(package_id)");
  await runSql("CREATE INDEX IF NOT EXISTS idx_doc_review_approvals_package ON doc_review_approvals(package_id)");
}

module.exports = { up };
