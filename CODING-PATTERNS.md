# Coding Patterns — Solar Dashboard

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## 1. Backend Pattern (Node.js / Express)

### โครงสร้าง Route File
```javascript
// 1. Imports
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');

// 2. Router
const router = express.Router();

// 3. Routes — คั่นด้วย comment block
// ============================================================
// GET /api/...
// ============================================================
router.get('/path', authenticateToken, async (req, res) => {
  try {
    // 4. Validation
    if (!field) return res.status(400).json({ error: '...' });

    // 5. Query DB
    const result = await pool.query('SELECT ... WHERE id = ?', [id]);

    // 6. Return response
    res.json(result.rows);
  } catch (error) {
    console.error('[MODULE_NAME]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 7. Export
module.exports = router;
```

### Naming Convention
| สิ่งที่ตั้งชื่อ | รูปแบบ | ตัวอย่าง |
|---------------|--------|----------|
| Route file | `doc-review-{module}.js` | `doc-review-checklists.js` |
| Table name | snake_case พหูพจน์ | `doc_review_checklists` |
| Column name | snake_case | `permit_type`, `package_id` |
| API path | `/api/{module}/{action}` | `/api/doc-review/checklists/batch-receive` |
| Error message | ภาษาไทย | `'เกิดข้อผิดพลาด'` |

### Response Pattern
```javascript
// Success
res.json(result.rows);
res.status(201).json(newRecord);

// Error
res.status(400).json({ error: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
res.status(404).json({ error: 'ไม่พบข้อมูล' });
res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
```

### Auth Pattern
```javascript
// Role-based
router.post('/', authenticateToken, authorizeRole(['admin', 'engineer']), handler);

// Permission-based
router.post('/', authenticateToken, authorizePermission('project.create'), handler);
```

### Transaction Pattern
```javascript
const result = await pool.transaction(async (tx) => {
  await tx.query('INSERT INTO ...');
  await tx.query('UPDATE ...');
  return data;
});
```

### Database Query Pattern
```javascript
// SELECT
const result = await pool.query('SELECT * FROM table WHERE col = ?', [value]);
const rows = result.rows;

// INSERT
await pool.query('INSERT INTO table (id, col1, col2) VALUES (?, ?, ?)', [uuidv4(), val1, val2]);

// UPDATE
await pool.query('UPDATE table SET col1 = ?, updated_at = datetime("now") WHERE id = ?', [val, id]);

// DELETE
await pool.query('DELETE FROM table WHERE id = ?', [id]);
```

---

## 2. Frontend Pattern (React)

### โครงสร้าง Page Component
```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

export default function PageName() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [dependencies]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await documentReviewAPI.someMethod();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6">
        ...
      </section>
    </div>
  );
}
```

### State Pattern
```javascript
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);
const [showModal, setShowModal] = useState(false);
const [editItem, setEditItem] = useState(null);
const [filter, setFilter] = useState({ status: '', search: '' });
```

### API Call Pattern
```javascript
// ใน api.js
export const documentReviewAPI = {
  getProjects: () => apiCall('GET', '/doc-review'),
  createProject: (data) => apiCall('POST', '/doc-review', data),
  deleteProject: (id) => {
    invalidateCache('GET:/doc-review');
    return apiCall('DELETE', `/doc-review/${id}`);
  },
};

// ใน component
const result = await documentReviewAPI.getProjects();
setData(Array.isArray(result) ? result : []);
```

### UI Component Pattern (Tailwind)
```jsx
// Section card
<section className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6">

// Table
<table className="min-w-full">
  <thead className="bg-slate-50 text-sm text-slate-500">
  <tbody className="divide-y divide-slate-100 text-sm">

// Button
<button className="px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">

// Badge
<span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">

// Input
<input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />

// Modal
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
```

---

## 3. Migration Pattern

```javascript
// ไฟล์: {number}_{description}.cjs

async function up(runSql) {
  // CREATE TABLE (IF NOT EXISTS)
  await runSql(`CREATE TABLE IF NOT EXISTS table_name (...)`);

  // ALTER TABLE (try-catch)
  try {
    await runSql("ALTER TABLE table_name ADD COLUMN new_col TYPE");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  // CREATE INDEX (IF NOT EXISTS)
  await runSql("CREATE INDEX IF NOT EXISTS idx_name ON table(col)");
}

module.exports = { up };
```

---

## 4. Naming Convention Summary

| Layer | Convention | ตัวอย่าง |
|-------|-----------|----------|
| DB Table | snake_case พหูพจน์ | `doc_review_checklists` |
| DB Column | snake_case | `permit_type`, `package_id` |
| Route File | `{module}.js` | `doc-review-checklists.js` |
| API Path | `/api/{module}/{action}` | `/api/doc-review/checklists/batch-receive` |
| Frontend Page | PascalCase | `DocReviewDetail.jsx` |
| Frontend Component | PascalCase | `TemplateForm`, `TimelineTab` |
| State Variable | camelCase | `showForm`, `filterPermitType` |
| CSS | Tailwind utility | `rounded-[28px]`, `bg-white` |
| Error Message | ภาษาไทย | `'เกิดข้อผิดพลาด'` |
| Commit | Conventional Commits | `feat(doc-review): ...` |

---

## 5. ไฟล์สำคัญที่ต้องรู้

| ไฟล์ | หน้าที่ |
|------|--------|
| `backend/src/middleware/auth.js` | JWT auth + role/permission check |
| `backend/src/database.js` | SQLite connection pool + transaction |
| `backend/src/index.js` | Express server + route mounting |
| `frontend/src/utils/api.js` | API client + token refresh |
| `frontend/src/context/AuthContext.jsx` | Auth state management |
| `frontend/src/components/ProtectedRoute.jsx` | Route guard |
| `frontend/src/utils/constants.js` | Status labels, colors, priority |
