# 📖 คู่มือการใช้งาน Solar Dashboard

## 📋 สารบัญ
1. [การเริ่มต้น](#การเริ่มต้น)
2. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
3. [การเข้าสู่ระบบ](#การเข้าสู่ระบบ)
4. [การใช้งานระบบ](#การใช้งานระบบ)
5. [การปรับเปลี่ยนแก้ไข](#การปรับเปลี่ยนแก้ไข)

---

## การเริ่มต้น

### 1️⃣ ตรวจสอบสภาพแวดล้อม
```bash
# ตรวจสอบ Node.js
node --version  # ควรเป็น v14 ขึ้นไป

# ตรวจสอบ npm
npm --version
```

### 2️⃣ ติดตั้ง Dependencies
```bash
# ติดตั้งไลบรารีสำหรับ Backend
cd backend
npm install

# ติดตั้งไลบรารีสำหรับ Frontend
cd ../frontend
npm install
```

### 3️⃣ ตั้งค่า Database
```bash
# สร้างไฟล์ .env ในโฟลเดอร์ backend
touch backend/.env

# เพิ่มการตั้งค่าต่อไปนี้:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solar_dashboard
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### 4️⃣ สร้างฐานข้อมูล
```bash
# เข้าสู่ PostgreSQL
psql -U postgres

# สร้างฐานข้อมูล
CREATE DATABASE solar_dashboard;

# นำเข้า Schema
\c solar_dashboard
\i backend/src/models/database-schema.sql
\i backend/src/models/seed-data.sql
```

---

## โครงสร้างโปรเจกต์

```
Dashboard/
├── backend/                 # 🔧 API Server
│   ├── src/
│   │   ├── index.js        # 📌 จุดเริ่มต้นเซิร์ฟเวอร์
│   │   ├── database.js     # 🗄️ การเชื่อมต่อ Database
│   │   ├── routes/         # 🛣️ API Routes
│   │   │   ├── auth.js     # 🔐 การเข้าสู่ระบบ
│   │   │   ├── projects.js # 📊 โครงการ
│   │   │   ├── users.js    # 👥 ผู้ใช้งาน
│   │   │   └── ... (อื่นๆ)
│   │   ├── middleware/     # 🛡️ Middleware
│   │   │   └── auth.js     # ✅ ตรวจสอบ JWT Token
│   │   └── models/         # 📁 Schema & Data
│   └── package.json
│
├── frontend/               # 🎨 Web Application
│   ├── src/
│   │   ├── App.jsx        # 📌 Component หลัก
│   │   ├── pages/         # 📄 หน้าต่างๆ
│   │   │   ├── Login.jsx      # 🔓 หน้าเข้าสู่ระบบ
│   │   │   ├── Dashboard.jsx  # 📊 แดชบอร์ด
│   │   │   ├── Projects.jsx   # 📋 โครงการ
│   │   │   └── ... (อื่นๆ)
│   │   ├── components/    # 🧩 Reusable Components
│   │   │   ├── Header.jsx     # 🔝 ส่วนหัวหน้า
│   │   │   ├── Sidebar.jsx    # 📍 เมนูด้านข้าง
│   │   │   └── ... (อื่นๆ)
│   │   ├── utils/         # 🔧 Helper Functions
│   │   │   └── api.js     # 🌐 API Calls
│   │   └── styles/        # 🎨 CSS Styles
│   └── package.json
│
└── docker-compose.yml    # 🐳 Docker Configuration
```

---

## การเข้าสู่ระบบ

### ข้อมูลการเข้าสู่ระบบทดลอง (Demo Account)
```
👤 ชื่อผู้ใช้: admin
🔑 รหัสผ่าน: admin
```

### ขั้นตอนการเข้าสู่ระบบ
1. เปิดหน้าเว็บ `http://localhost:3000`
2. ป้อนชื่อผู้ใช้ (username)
3. ป้อนรหัสผ่าน (password)
4. คลิกปุ่ม "เข้าสู่ระบบ"

---

## การใช้งานระบบ

### 🏠 หน้าแรก (Dashboard)
- **ที่ตั้ง**: ที่เมนู "แดชบอร์ด"
- **ความสำคัญ**: แสดงสรุปข้อมูลทั้งระบบ
- **ส่วนประกอบ**:
  - 📊 KPI Cards: แสดงสถิติสำคัญ
  - 📈 Pipeline Chart: แสดงแบบไลน์
  - 📍 ตำแหน่งเซ็นเซอร์: แสดงแผนที่

### 📋 โครงการ (Projects)
- **ที่ตั้ง**: ที่เมนู "โครงการ"
- **ฟังก์ชัน**:
  - ✅ ดูรายชื่อโครงการทั้งหมด
  - ➕ เพิ่มโครงการใหม่
  - ✏️ แก้ไขข้อมูลโครงการ
  - 🗑️ ลบโครงการ

### 👥 ผู้ใช้งาน (Users)
- **ที่ตั้ง**: ที่เมนู "ผู้ใช้งาน"
- **ฟังก์ชัน**:
  - ✅ ดูรายชื่อผู้ใช้ทั้งหมด
  - ➕ เพิ่มผู้ใช้ใหม่
  - ✏️ แก้ไขข้อมูลผู้ใช้
  - 🗑️ ลบผู้ใช้

### 📊 รายงาน (Reports)
- **ที่ตั้ง**: ที่เมนู "รายงาน"
- **ประเภท**:
  - 📈 รายงานรายเดือน
  - 📊 รายงานตามสถานี
  - 📉 รายงานตามช่วงเวลา

---

## การปรับเปลี่ยนแก้ไข

### 🖋️ แก้ไขข้อความในเมนู

#### ไฟล์ที่ต้องแก้ไข:
```
frontend/src/components/Sidebar.jsx
```

#### วิธีการแก้ไข:
```javascript
// ค้นหาส่วนต่อไปนี้:
const menuItems = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, path: '/' },
  { id: 'projects', label: 'โครงการ', icon: Zap, path: '/projects' },
  // ...
];

// เปลี่ยนค่า label เป็นข้อความที่ต้องการ
// ตัวอย่าง:
{ id: 'dashboard', label: 'หน้าแรก', icon: LayoutDashboard, path: '/' },
```

### 🎨 เปลี่ยนสีและหน้าตา

#### ไฟล์สไตล์:
```
frontend/src/styles/index.css         # CSS ทั่วไป
frontend/tailwind.config.js           # Tailwind Configuration
frontend/postcss.config.js            # PostCSS Configuration
```

#### ตัวอย่างการแก้ไข:
```css
/* ในไฟล์ index.css ให้หาส่วน primary color */
:root {
  --primary-600: #... /* เปลี่ยนรหัสสีที่นี่ */
}
```

### 🔌 เพิ่ม API Endpoint ใหม่

#### ขั้นตอน:
1. **สร้างไฟล์ Route** ใน `backend/src/routes/` เช่น `new-feature.js`
2. **เพิ่มโค้ด** ตัวอย่าง:
```javascript
// backend/src/routes/new-feature.js
const express = require('express');
const router = express.Router();

// 📌 ตัวอย่าง: ดึงข้อมูลทั้งหมด
router.get('/', async (req, res) => {
  try {
    // 🔧 เขียนโค้ด Query ที่นี่
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

3. **ลงทะเบียน Route** ใน `backend/src/index.js`:
```javascript
app.use('/api/new-feature', require('./routes/new-feature'));
```

### 🎯 เพิ่มหน้าใหม่ในระบบ

#### ขั้นตอน:
1. **สร้างไฟล์ Page** ใน `frontend/src/pages/` เช่น `NewPage.jsx`
2. **สร้าง Component**:
```javascript
// frontend/src/pages/NewPage.jsx
import React from 'react';

export default function NewPage() {
  return (
    <div>
      <h1>📄 หน้าใหม่ของฉัน</h1>
      {/* เขียนอะไรที่นี่ */}
    </div>
  );
}
```

3. **เพิ่มเข้าเมนู** ใน `frontend/src/components/Sidebar.jsx`:
```javascript
const menuItems = [
  // ...
  { 
    id: 'new-page', 
    label: 'หน้าใหม่', 
    icon: YourIcon, 
    path: '/new-page' 
  },
];
```

4. **เพิ่ม Route** ใน `frontend/src/App.jsx`:
```javascript
<Route path="/new-page" element={<NewPage />} />
```

### 🔐 เปลี่ยนข้อมูลผู้ใช้ทดลอง

#### ไฟล์ที่ต้องแก้ไข:
```
backend/src/models/seed-data.sql
```

#### ตัวอย่าง:
```sql
-- ค้นหาส่วน INSERT INTO users และแก้ไขข้อมูล
INSERT INTO users (id, username, email, password, full_name, role) 
VALUES (
  '...', 
  'admin',              -- 🔧 เปลี่ยนชื่อผู้ใช้
  'admin@example.com',  -- 🔧 เปลี่ยน Email
  '...',                -- รหัสผ่าน (Hashed)
  'ผู้ดูแลระบบ',        -- 🔧 เปลี่ยนชื่อจริง
  'admin'               -- 🔧 เปลี่ยนบทบาท
);
```

---

## ⚠️ ข้อควรระวัง

### 🛡️ ความปลอดภัย
- ❌ **ห้าม** ใส่รหัสผ่านลงใน Git
- ✅ ใช้ไฟล์ `.env` แทน
- ✅ เปลี่ยน JWT_SECRET ให้เป็นค่าที่ปลอดภัย

### 📊 การแก้ไข Database
- ✅ ทำ Backup ก่อนแก้ไข Schema
- ✅ ทดสอบในสภาพแวดล้อม Development ก่อน
- ✅ รันคำสั่ง `npm run lint` เพื่อตรวจสอบโค้ด

### 🐛 Debug
```bash
# สำหรับ Backend
cd backend
npm run dev  # เรียกใช้ Nodemon สำหรับ Auto Reload

# สำหรับ Frontend
cd frontend
npm start    # เรียกใช้ Dev Server
```

---

## 📞 ติดต่อและสนับสนุน

หากมีปัญหา โปรดตรวจสอบ:
1. ✅ ว่า Node.js และ PostgreSQL ถูกติดตั้งแล้ว
2. ✅ ว่า `.env` ถูกตั้งค่าอย่างถูกต้อง
3. ✅ ว่า Database ถูกสร้างและมีข้อมูลแล้ว
4. ✅ Log ของ Console สำหรับข้อความ Error

---

**✅ ทำเสร็จแล้ว! ลองนำไปใช้งานกันเลยครับ** 🎉
