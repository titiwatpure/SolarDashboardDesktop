const jwt = require('jsonwebtoken'); // ใช้สำหรับสร้างและตรวจสอบ JWT Token

// บังคับตั้งค่า JWT_SECRET — ไม่ใช้ fallback เพื่อความปลอดภัย
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it to .env file.');
  process.exit(1);
}

// ฟังก์ชันตรวจสอบว่าผู้ใช้มี Token ที่ถูกต้องก่อนเข้าถึง API
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token ไม่พบ' });
  }

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token ไม่ถูกต้อง' });
    }
    req.user = user;
    next();
  });
};

// ฟังก์ชันตรวจสอบสิทธิ์ตาม Role ของผู้ใช้
// ใช้ต่อจาก authenticateToken เพื่อกำหนดว่า Role ไหนเข้าถึงได้
// ตัวอย่างการใช้: authorizeRole(['admin']) หมายความว่า เฉพาะ admin เท่านั้น
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' }); // ถ้า Role ไม่ตรง ให้ตอบ 403 Forbidden
    }
    next(); // ผ่านไปยัง route ถัดไปได้
  };
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRole
};
