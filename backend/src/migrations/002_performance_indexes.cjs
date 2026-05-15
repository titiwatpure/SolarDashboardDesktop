/**
 * Migration 002: Performance Composite Indexes
 * เพิ่ม composite indexes สำหรับ report queries ที่ช้า
 */
module.exports = {
  async up(runSql) {
    const indexes = [
      // Projects: report queries ที่ filter ตาม status + step
      `CREATE INDEX IF NOT EXISTS idx_projects_status_step ON projects(status, current_step)`,
      // Projects: risk report (risk_level + status)
      `CREATE INDEX IF NOT EXISTS idx_projects_risk_status ON projects(risk_level, status)`,
      // Projects: province report (province + status)
      `CREATE INDEX IF NOT EXISTS idx_projects_province_status ON projects(province, status)`,
      // Projects: responsible_user + status สำหรับ performance report
      `CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(responsible_user, status)`,
      // Project timeline: lead-time calculation (project_id + step + created_at)
      `CREATE INDEX IF NOT EXISTS idx_timeline_project_step_time ON project_timeline(project_id, step, created_at)`,
      // Tasks: summary by priority/status
      `CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON tasks(priority, status)`,
      // Tasks: overdue check (due_date + status)
      `CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status)`,
      // Transactions: accounting reports (project_id + type + date)
      `CREATE INDEX IF NOT EXISTS idx_transactions_proj_type_date ON transactions(project_id, type, transaction_date)`,
      // Activity logs: cleanup query (entity_type + created_at)
      `CREATE INDEX IF NOT EXISTS idx_activity_entity_time ON activity_logs(entity_type, created_at)`,
      // Notifications: cleanup query (is_read + created_at)
      `CREATE INDEX IF NOT EXISTS idx_notifications_read_time ON notifications(is_read, created_at)`,
    ];

    for (const sql of indexes) {
      try {
        await runSql(sql);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }
  }
};
