# Solar Dashboard - Quick Start

## ความต้องการ
- Node.js 18+
- npm

> ระบบนี้ใช้ **SQLite** ไม่ต้องติดตั้ง PostgreSQL หรือ database server อื่น

---

## เริ่มต้นใน 3 ขั้นตอน

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# แก้ JWT_SECRET ใน .env ให้เป็นค่าที่ปลอดภัย
node src/init-db.cjs
npm run dev
```

### 2. Frontend (เปิด terminal ใหม่)
```bash
cd frontend
npm install
npm start
```

### 3. เข้าสู่ระบบ
เปิด http://localhost:3000
```
Username: admin
Password: admin
```

---

## หรือใช้ Docker (ทั้งระบบ)

```bash
docker compose up -d --build
```
เปิด http://localhost:3000

---

## คุณสมบัติหลัก

| เมนู | หน้าที่ |
|------|--------|
| ภาพรวม | KPI, Pipeline, ตารางโครงการ |
| โครงการ | เพิ่ม/แก้ไข/ลบ, Workflow 7 ขั้นตอน |
| หน่วยงาน | จัดการ กกพ., PEA, MEA และอื่นๆ |
| เอกสาร | Upload/ดาวน์โหลดไฟล์จริง |
| รายงาน | สรุปตามสถานะ/ขนาด/จังหวัด + Export |
| ผู้ใช้งาน | Admin / Engineer |
| ตั้งค่า | เปลี่ยนรหัสผ่าน, ตั้งค่าแจ้งเตือน |

## API Endpoints หลัก

```
POST   /api/auth/login              # เข้าสู่ระบบ
POST   /api/auth/refresh            # ขอ token ใหม่
POST   /api/auth/logout             # ออกจากระบบ
GET    /api/projects                # รายการโครงการ
POST   /api/projects                # สร้างโครงการ
GET    /api/projects/stats/kpis     # KPI
GET    /api/users                   # รายการผู้ใช้
PUT    /api/users/change-password   # เปลี่ยนรหัสผ่าน
POST   /api/documents               # เพิ่มเอกสาร (file upload)
GET    /api/documents/download/:id  # ดาวน์โหลดไฟล์
GET    /api/notifications/unread-count  # แจ้งเตือน
GET    /api/health                  # สถานะเซิร์ฟเวอร์
```

## แก้ไขปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|-------|---------|
| CORS error | ตรวจสอบ `CORS_ORIGIN` ใน `.env` |
| Port ถูกใช้อยู่ | เปลี่ยน `PORT` ใน `.env` |
| ข้อมูลหาย | รัน `node src/init-db.cjs` ใหม่ (ข้อมูลเดิมไม่หาย) |
| Token หมดอายุ | Login ใหม่ หรือใช้ refresh token |

## รัน Tests

```bash
cd backend
npm test
```

## Documentation

- [README.md](README.md) - เอกสารหลัก
- [INSTALLATION.md](INSTALLATION.md) - คู่มือการติดตั้ง
- [DEVELOPMENT.md](DEVELOPMENT.md) - คู่มือการพัฒนา
- [USAGE_GUIDE.md](USAGE_GUIDE.md) - คู่มือการใช้งาน
