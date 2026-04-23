/**
 * Solar Dashboard Backend - แอปพลิเคชันหลังบ้านสำหรับระบบติดตามโครงการ Solar
 * 
 * วัตถุประสงค์: จัดการข้อมูลโครงการ ผู้ใช้ เอกสาร รายงาน และสิ่งที่เกี่ยวข้อง
 * 
 * มีการใช้ Framework:
 * - Express.js: Server HTTP
 * - PostgreSQL: ฐานข้อมูล
 * - JWT: การตรวจสอบสิทธิ์
 * - BCrypt: เข้ารหัสรหัสผ่าน
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// Middleware - ซอฟต์แวร์กลางสำหรับประมวลผลคำขอ
// ========================
// CORS: อนุญาตการร้องขอจากโดเมนต่างๆ
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
