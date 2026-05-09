/**
 * Solar Dashboard Backend - แอปพลิเคชันหลังบ้านสำหรับระบบติดตามโครงการ Solar
 * 
 * วัตถุประสงค์: จัดการข้อมูลโครงการ ผู้ใช้ เอกสาร รายงาน และสิ่งที่เกี่ยวข้อง
 * 
 * มีการใช้ Framework:
 * - Express.js: Server HTTP
 * - SQLite: ฐานข้อมูล
 * - JWT: การตรวจสอบสิทธิ์
 * - BCrypt: เข้ารหัสรหัสผ่าน
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// Middleware - ซอฟต์แวร์กลางสำหรับประมวลผลคำขอ
// ========================
// H-1: trust proxy — สำหรับ rate limiting ที่อยู่หลัง reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting - ป้องกัน brute-force
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 200, // สูงสุด 200 requests ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'มีคำขอมากเกินไป กรุณารอสักครู่' }
});
app.use('/api/', limiter);

// Rate limit เข้มงวดสำหรับ login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'เข้าสู่ระบบล้มเหลวหลายครั้ง กรุณารอ 15 นาที' }
});
app.use('/api/auth/login', loginLimiter);

// CORS: อนุญาตการร้องขอจากโดเมนต่างๆ
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  maxAge: 86400
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity-logs', require('./routes/activity_logs'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));

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

// H-7: จัดการ unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
