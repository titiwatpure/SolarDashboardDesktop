/**
 * Jest setup — สร้าง test database ก่อนรัน tests
 * ใช้ DB_PATH แยกจาก production DB (solar_dashboard_test.db)
 */
const { initDB } = require('./src/init-db');

module.exports = async () => {
  await initDB();
};
