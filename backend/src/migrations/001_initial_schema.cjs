/**
 * Migration 001: Initial Schema
 * เพิ่มคอลัมน์ใหม่สำหรับ database ที่มีอยู่แล้ว
 */
module.exports = {
  async up(runSql) {
    const migrations = [
      "ALTER TABLE projects ADD COLUMN scope_start TEXT NOT NULL DEFAULT 'survey'",
      "ALTER TABLE projects ADD COLUMN scope_end TEXT NOT NULL DEFAULT 'cod'",
      "ALTER TABLE projects ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL",
      "ALTER TABLE projects ADD COLUMN site_address TEXT",
      "ALTER TABLE projects ADD COLUMN site_lat REAL",
      "ALTER TABLE projects ADD COLUMN site_lng REAL",
      "ALTER TABLE projects ADD COLUMN grid_station TEXT",
      "ALTER TABLE projects ADD COLUMN grid_voltage TEXT",
      "ALTER TABLE projects ADD COLUMN contract_number TEXT",
      "ALTER TABLE projects ADD COLUMN contract_value REAL",
      "ALTER TABLE projects ADD COLUMN contract_date TEXT",
      "ALTER TABLE projects ADD COLUMN budget REAL",
      "ALTER TABLE users ADD COLUMN phone TEXT",
      "ALTER TABLE customers ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL",
    ];

    for (const sql of migrations) {
      try {
        await runSql(sql);
      } catch (err) {
        // คอลัมน์มีอยู่แล้ว — ข้าม
        if (!err.message.includes('duplicate column')) {
          throw err;
        }
      }
    }
  }
};
