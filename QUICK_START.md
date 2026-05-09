# Solar Dashboard - Quick Start

## ความต้องการ
- Node.js 16+
- npm

> ✅ ไม่ต้องติดตั้ง PostgreSQL — ระบบใช้ **SQLite** (ไฟล์ `.db` ในเครื่องเลย)

---

## เริ่มต้นใน 3 ขั้นตอน

### 1️⃣ Backend
```bash
cd backend
npm install
# สร้าง .env แล้วใส่ JWT_SECRET=mysecret เป็นอย่างน้อย
node src/init-db.cjs
npm run dev
```

### 2️⃣ Frontend
```bash
cd frontend
npm install
npm start
```

### 3️⃣ เข้าสู่ระบบ
เปิด [http://localhost:3000](http://localhost:3000)
```
Username: admin
Password: admin
```

---

## คุณสมบัติหลัก

| เมนู | หน้าที่ |
|------|--------|
| ภาพรวม | KPI, Pipeline, ตารางโครงการ |
| โครงการ | เพิ่ม/แก้ไข/ลบ, Workflow 7 ขั้นตอน |
| หน่วยงาน | จัดการ กกพ., PEA, MEA และอื่นๆ |
| รายงาน | สรุปตามสถานะ/ขนาด/จังหวัด/ขั้นตอน |
| ผู้ใช้งาน | Admin / Engineer |

## API Endpoints

```
POST   /api/auth/login
GET    /api/projects
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/stats/kpis
GET    /api/users
GET    /api/reports/summary/status
GET    /api/reports/summary/size
GET    /api/reports/summary/province
GET    /api/reports/summary/step
GET    /api/health
```

## แก้ไขปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|-------|---------|
| CORS error | ตรวจสอบ `CORS_ORIGIN` ใน `.env` |
| Port ถูกใช้อยู่ | เปลี่ยน `PORT` ใน `.env` |
| ข้อมูลขาดหาย | รัน `node src/init-db.cjs` ใหม่ |

## 🎯 คุณสมบัติหลักที่ได้รับ

### ✅ Dashboard
- KPI Cards แสดงสถิติทั่วไป
- Pipeline visualization แสดงความคืบหน้า
- ตารางโครงการพร้อม filter

### ✅ โครงการ
- เพิ่ม / แก้ไข / ลบ โครงการ
- 7 ขั้นตอนการดำเนินการ
- 4 สถานะโครงการ
- Logic อัตโนมัติสำหรับสถานะ

### ✅ ระบบกฎหมาย
- ✓ การตรวจสอบขนาด (≤ / > 1000 kVA)
- ✓ การตรวจสอบการขายไฟ
- ✓ กำหนดประเภทใบอนุญาตอัตโนมัติ

### ✅ หน่วยงาน
รองรับ 7 ประเภท: กกพ., PEA, MEA, อบต., เทศบาล, กรมโรงงาน, นิคมอุตสาหกรรม

### ✅ เอกสาร
- Upload ไฟล์ (SLD, ใบอนุญาต, Test Report)
- ติดตามสถานะเอกสาร

### ✅ รายงาน
- สรุปตามสถานะ, ขนาด, จังหวัด, ขั้นตอน
- Visualization ด้วย charts

### ✅ ผู้ใช้งาน
- Role-based access (Admin, Engineer)
- JWT Authentication

### ✅ ตั้งค่า
- ตั้งค่าทั่วไป
- ความปลอดภัย
- การแจ้งเตือน
- ระบบ

## 🎨 UI Design

### โทนสี
- **น้ำเงินเข้ม** (หลัก): #0066cc
- **เขียว** (สำเร็จ): #10b981
- **เหลือง** (กำลังดำเนินการ): #f59e0b
- **แดง** (ปัญหา): #ef4444

### Layout
- Sidebar Navigation
- Header ด้านบน
- Responsive Design
- Card-based UI
- Shadow Effects
- Grid Layout

## 📁 Project Structure

```
Dashboard/
├── backend/          # Express API
├── frontend/         # React Application
├── README.md         # Documentation
├── INSTALLATION.md   # Setup Guide
├── DEVELOPMENT.md    # Dev Guide
└── docker-compose.yml # Docker config
```

## 🔗 API Endpoints (ตัวอย่าง)

```
# Authentication
POST   /api/auth/login
POST   /api/auth/register

# Projects
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/stats/kpis

# Users
GET    /api/users
GET    /api/users/profile
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id

# Organizations
GET    /api/organizations

# Documents
GET    /api/documents/project/:id
POST   /api/documents
DELETE /api/documents/:id

# Reports
GET    /api/reports/summary/status
GET    /api/reports/summary/size
GET    /api/reports/summary/province
GET    /api/reports/summary/step
```

## 🔧 Troubleshooting

### ❌ CORS Error
→ ตรวจสอบ CORS_ORIGIN ใน backend .env

### ❌ Port already in use
→ ใช้ port อื่น: `PORT=5001 npm run dev`

### ❌ Database connection error
→ ตรวจสอบ DB credentials ใน .env

### ❌ npm modules not found
→ ลบ node_modules และ run `npm install` ใหม่

## 📚 Documentation

- [INSTALLATION.md](INSTALLATION.md) - คำแนะนำการติดตั้ง
- [DEVELOPMENT.md](DEVELOPMENT.md) - คำแนะนำการพัฒนา
- [API Documentation](#-api-endpoints) - API Endpoints
- [README.md](README.md) - เอกสารหลัก

## 🚢 Deploy to Production

```bash
# Build Frontend
cd frontend
npm run build

# Deploy Backend
cd backend
npm start  # ใช้ NODE_ENV=production

# หรือใช้ Docker
docker-compose -f docker-compose.yml up -d
```

## 💡 Tips & Tricks

1. ใช้ Postman สำหรับทดสอบ API
2. ใช้ React DevTools สำหรับ debug frontend
3. ใช้ pgAdmin สำหรับจัดการ database
4. Monitor logs ด้วย `tail -f logs.txt`

## 🆘 ต้องการความช่วยเหลือ?

อ่านเอกสารลายละเอียดเพิ่มเติมใน:
- [INSTALLATION.md](INSTALLATION.md)
- [DEVELOPMENT.md](DEVELOPMENT.md)
- [README.md](README.md)

## 📝 License

MIT License - ใช้ได้ฟรี

---

**Happy Coding! 🎉**

หากมีข้อถามหรือปัญหา โปรดติดต่อทีมพัฒนา
