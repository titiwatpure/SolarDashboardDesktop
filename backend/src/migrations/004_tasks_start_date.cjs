module.exports = {
  async up(runSql) {
    // เพิ่ม start_date column ในตาราง tasks (ถ้ายังไม่มี)
    try {
      await runSql("ALTER TABLE tasks ADD COLUMN start_date DATE");
    } catch (err) {
      // column มีอยู่แล้ว → ข้าม
      if (!err.message.includes('duplicate column')) throw err;
    }
  }
};
