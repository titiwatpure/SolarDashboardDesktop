/**
 * Migration 012: เพิ่ม service_type field
 * วันที่: 14 กรกฎาคม 2569
 * วัตถุประสงค์: เพิ่ม field service_type ใน projects table
 */

async function runMigration(pool) {
  console.log('🔄 Running migration 012: Add service_type field');

  try {
    // เพิ่ม service_type column
    await pool.query(`
      ALTER TABLE projects ADD COLUMN service_type TEXT DEFAULT 'full'
    `);
    console.log('  ✅ Added service_type column');
  } catch (error) {
    // Column อาจมีอยู่แล้ว
    if (error.message.includes('duplicate column')) {
      console.log('  ⏭️ service_type column already exists');
    } else {
      throw error;
    }
  }

  try {
    // เพิ่ม index สำหรับ service_type
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_service_type ON projects(service_type)
    `);
    console.log('  ✅ Added index for service_type');
  } catch (error) {
    console.log('  ⏭️ Index already exists');
  }

  console.log('✅ Migration 012 complete');
}

module.exports = { runMigration };
