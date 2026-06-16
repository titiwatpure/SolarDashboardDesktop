const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it to .env file.');
  process.exit(1);
}

// Role-Permission Matrix
const PERMISSIONS = {
  admin: [
    'project.create', 'project.update.own', 'project.update.all', 'project.delete',
    'task.create', 'task.assign', 'task.delete',
    'document.upload', 'document.delete',
    'checkpoint.approve',
    'report.view', 'report.export',
    'user.manage', 'org.manage', 'audit.view',
    'approval.manage',
  ],
  engineer: [
    'project.create', 'project.update.own',
    'task.create', 'task.assign',
    'document.upload',
    'checkpoint.approve',
    'report.view', 'report.export',
  ],
  staff: [
    'project.create',
    'task.create',
    'document.upload',
    'report.view', 'report.export',
  ],
  client: [
    'report.view',
  ],
};

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

// Legacy role check (backward compatible)
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    next();
  };
};

// Permission-based authorization
const authorizePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = PERMISSIONS[userRole] || [];

    const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    next();
  };
};

// Check if user has a specific permission (non-middleware helper)
const hasPermission = (role, permission) => {
  return (PERMISSIONS[role] || []).includes(permission);
};

module.exports = {
  JWT_SECRET,
  PERMISSIONS,
  authenticateToken,
  authorizeRole,
  authorizePermission,
  hasPermission,
};
