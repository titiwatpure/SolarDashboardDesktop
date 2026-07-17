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
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Static files - uploads directory (removed: use authenticated /api/documents/download/:id endpoint instead)

// Serve frontend in production (only if frontend build exists)
if (isProduction) {
  const frontendBuild = process.env.FRONTEND_BUILD_DIR || path.join(__dirname, '..', '..', 'frontend', 'build');
  const fs = require('fs');
  if (fs.existsSync(frontendBuild)) {
    app.use(express.static(frontendBuild));
  }
}

// ========================
// Middleware - ซอฟต์แวร์กลางสำหรับประมวลผลคำขอ
// ========================
// H-1: trust proxy — สำหรับ rate limiting ที่อยู่หลัง reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.ELECTRON_MODE ? false : undefined,
}));

// CORS: อนุญาตการร้องขอจากโดเมนต่างๆ (ต้องอยู่ก่อน rate limiter)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  maxAge: 86400
}));

// Rate limiting - ป้องกัน brute-force
const isDev = !isProduction;
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: isDev ? 9999 : 200, // dev: unlimited, prod: 200 requests ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: isDev ? () => true : undefined, // dev mode: skip rate limiting entirely
  message: { error: 'มีคำขอมากเกินไป กรุณารอสักครู่' }
});
app.use('/api/', limiter);

// Rate limit เข้มงวดสำหรับ login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 9999 : 20,
  skip: isDev ? () => true : undefined, // dev mode: skip rate limiting entirely
  message: { error: 'เข้าสู่ระบบล้มเหลวหลายครั้ง กรุณารอ 15 นาที' }
});
app.use('/api/auth/login', loginLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance: API response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    if (elapsed >= 200) console.warn(`[SLOW API ${elapsed}ms] ${req.method} ${req.originalUrl}`);
  });
  next();
});

// Static files - serve uploads (logos, etc.)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api', require('./routes/checkpoints'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/permit-tracking', require('./routes/permit-tracking'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/accounting', require('./routes/accounting'));

// Document Review & Agency Submission Tracking
// Mount template-checklists FIRST to avoid /:id conflict with packages
app.use('/api/doc-review/template-checklists', require('./routes/doc-review-template-checklists'));
// Mount packages BEFORE other routes to avoid /:id conflict
app.use('/api/doc-review', require('./routes/doc-review-packages'));
app.use('/api/doc-review', require('./routes/doc-review-checklists'));
app.use('/api/doc-review', require('./routes/doc-review-files'));
app.use('/api/doc-review', require('./routes/doc-review-comments'));
app.use('/api/doc-review', require('./routes/doc-review-approvals'));
app.use('/api/doc-review', require('./routes/doc-review-submissions'));
app.use('/api/doc-review', require('./routes/doc-review-projects'));
app.use('/api/doc-review', require('./routes/doc-review-receipts'));
app.use('/api/doc-review', require('./routes/doc-review-issues'));
app.use('/api/doc-review', require('./routes/doc-review-correction-reports'));

// Health check with DB connectivity
const pool = require('./database');
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'OK',
      message: 'Server is running',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Database connection failed',
      database: 'disconnected',
    });
  }
});

// SPA fallback - serve frontend for non-API routes in production
if (isProduction) {
  const frontendIndex = path.join(process.env.FRONTEND_BUILD_DIR || path.join(__dirname, '..', '..', 'frontend', 'build'), 'index.html');
  const fs = require('fs');
  if (fs.existsSync(frontendIndex)) {
    app.get('*', (req, res) => {
      res.sendFile(frontendIndex);
    });
  } else {
    app.get('*', (req, res) => {
      res.json({ message: 'API is running. Frontend is deployed separately.' });
    });
  }
}

// Structured error handling
const { AppError } = require('./utils/errors');
const { logActivity } = require('./routes/activity_logs');

app.use((err, req, res, _next) => {
  console.error(err.stack);

  // Log the error
  const ipAddress = req.ip || req.socket?.remoteAddress;
  logActivity(req.user?.id || null, 'error', 'system', null, {
    message: err.message,
    path: req.path,
    method: req.method,
  }, ipAddress, 'error');

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.errorCode,
      details: err.details,
    });
  }

  res.status(err.status || 500).json({
    error: 'เกิดข้อผิดพลาดภายในระบบ',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// H-7: จัดการ unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Start server only when not imported for testing
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);

    // Run maintenance tasks on startup (vacuum + cleanup old logs)
    const { runMaintenance } = require('./services/maintenance');
    runMaintenance().then(results => {
      if (results.vacuum) console.log('✅ Monthly VACUUM completed');
      if (results.cleanup) console.log('✅ Old logs cleanup completed');
    }).catch(err => {
      console.error('Maintenance error:', err.message);
    });
  });
}

module.exports = app;
