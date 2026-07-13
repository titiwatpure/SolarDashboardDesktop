/**
 * Migration 011: เพิ่ม Performance Indexes
 * วันที่: 11 กรกฎาคม 2569
 * วัตถุประสงค์: เพิ่ม indexes สำหรับ query ที่ใช้บ่อย
 */

async function runMigration(pool) {
  console.log('🔄 Running migration 011: Performance Indexes');

  const indexes = [
    // Projects - เพิ่มสำหรับ sort/filter ที่ใช้บ่อย
    { name: 'idx_projects_created_at', table: 'projects', column: 'created_at' },
    { name: 'idx_projects_size_kw', table: 'projects', column: 'size_kw' },

    // Tasks - เพิ่มสำหรับ overdue query และ sorting
    { name: 'idx_tasks_created_at', table: 'tasks', column: 'created_at' },

    // Documents - เพิ่มสำหรับ filter by type
    { name: 'idx_documents_document_type', table: 'documents', column: 'document_type' },

    // Notifications - เพิ่มสำหรับ sorting
    { name: 'idx_notifications_created_at', table: 'notifications', column: 'created_at' },

    // Quotations - เพิ่มสำหรับ sorting
    { name: 'idx_quotations_created_at', table: 'quotations', column: 'created_at' },

    // Contracts - เพิ่มสำหรับ sorting
    { name: 'idx_contracts_created_at', table: 'contracts', column: 'created_at' },

    // Organizations - เพิ่มสำหรับ search
    { name: 'idx_organizations_name', table: 'organizations', column: 'org_name' },

    // Composite indexes สำหรับ query ที่ใช้บ่อย
    { name: 'idx_projects_status_created', table: 'projects', column: 'status, created_at' },
    { name: 'idx_tasks_status_due', table: 'tasks', column: 'status, due_date' },
    { name: 'idx_documents_project_type', table: 'documents', column: 'project_id, document_type' },
  ];

  let added = 0;
  for (const idx of indexes) {
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
      added++;
      console.log(`  ✅ ${idx.name}`);
    } catch (error) {
      // Ignore if index already exists
      if (!error.message.includes('already exists')) {
        console.log(`  ⚠️ ${idx.name}: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Migration 011 complete: ${added} indexes added`);
}

module.exports = { runMigration };
