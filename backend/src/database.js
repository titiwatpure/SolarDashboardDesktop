/**
 * SQLite Database Setup
 * 
 * ใช้สำหรับ:
 * - เชื่อมต่อกับฐานข้อมูล SQLite
 * - สร้างตาราและ seed data
 * - รันคำสั่ง SQL ต่างๆ
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// ❗ ปรับปรุง: ใช้ SQLite แทน PostgreSQL
const dbPath = path.join(__dirname, '..', 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ เกิดข้อผิดพลาดขณะเปิดฐานข้อมูล:', err.message);
  } else {
    console.log('✅ เชื่อมต่อ SQLite สำเร็จ:', dbPath);
  }
});

// ✅ Wrapper สำหรับทำให้ compatible กับ PostgreSQL code
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // แปลง $1, $2 ของ PostgreSQL เป็น ? ของ SQLite
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      
      db.all(sqliteSql, params, (err, rows) => {
        if (err) {
          console.error('❌ Query Error:', err);
          reject(err);
        } else {
          // ส่งกลับในรูปแบบเดียวกับ PostgreSQL
          resolve({ rows: rows || [] });
        }
      });
    });
  }
};

// ✅ export สำหรับใช้ในอื่นๆ
module.exports = pool;
