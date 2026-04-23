# Solar Dashboard - Quick Start Guide

## 🚀 เริ่มต้นอย่างรวดเร็ว (Quick Start)

### ความต้องการพื้นฐาน
- Node.js 16+
- PostgreSQL 12+
- npm หรือ yarn

### 1. Clone & Setup Database

```bash
# สร้าง database
createdb solar_dashboard

# Import schema
psql -d solar_dashboard -f backend/src/models/database-schema.sql

# (Optional) Import sample data
psql -d solar_dashboard -f backend/src/models/seed-data.sql
```

### 2. ตั้งค่า Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
# Server จะเริ่มที่ localhost:5000
```

### 3. ตั้งค่า Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
# Application จะเปิดที่ localhost:3000
```

## 📋 เข้าสู่ระบบทดลอง

```
Username: admin
Password: admin
```

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
