/**
 * Migration 013: Create report_drafts table
 * เก็บข้อมูลรายงานที่ผู้ใช้กรอกเอง
 */

const up = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_drafts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'รายงานผู้บริหาร',
      report_date DATE NOT NULL,
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'draft',
      summary TEXT,
      analysis TEXT,
      recommendations TEXT,
      notes TEXT,
      prepared_by TEXT,
      approved_by TEXT,
      reviewed_by TEXT,
      action_items TEXT DEFAULT '[]',
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_report_drafts_date ON report_drafts(report_date)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_report_drafts_status ON report_drafts(status)
  `);

  console.log('✅ Migration 013: report_drafts table created');
};

const down = async (pool) => {
  await pool.query('DROP TABLE IF EXISTS report_drafts');
  console.log('✅ Migration 013: report_drafts table dropped');
};

module.exports = { up, down };
