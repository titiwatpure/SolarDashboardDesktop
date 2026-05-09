# Solar Dashboard - คู่มือการติดตั้ง

## ข้อกำหนดระบบ

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

> ✅ **ระบบนี้ใช้ SQLite** เป็นฐานข้อมูล ไม่ต้องติดตั้ง PostgreSQL

---

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Backend

```bash
cd backend
npm install
```

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
```

สร้างฐานข้อมูลและ seed ข้อมูลตัวอย่าง:

```bash
node src/init-db.cjs
```

รัน Backend:

```bash
npm run dev
# Server จะเริ่มที่ http://localhost:5000
```

### 2. ติดตั้ง Frontend

```bash
cd frontend
npm install
npm start
# Application จะเปิดที่ http://localhost:3000
```

---

## ข้อมูลเข้าสู่ระบบทดลอง

```
Username: admin
Password: admin
```

---

## ตั้งค่า Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=เปลี่ยนเป็นค่าที่ปลอดภัย
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env`) — ถ้ามี
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## ฐานข้อมูล SQLite

ไฟล์ฐานข้อมูลจะถูกสร้างที่ `backend/solar_dashboard.db` อัตโนมัติเมื่อรัน `init-db.cjs`

### สร้างฐานข้อมูลใหม่
```bash
cd backend
node src/init-db.cjs
```

### เพิ่มตารางใหม่
แก้ไขไฟล์ `backend/src/init-db.cjs` ในส่วน `const tables = [...]`
แล้วรัน `node src/init-db.cjs` อีกครั้ง

---

## การสร้างผู้ใช้ใหม่

### ผ่าน API (ต้อง Login เป็น Admin ก่อน)
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"username":"engineer1","email":"eng@example.com","password":"pass123","role":"engineer"}'
```

### ผ่านหน้า Users ในระบบ
เข้าเมนู **ผู้ใช้งาน** → กดปุ่ม **เพิ่มผู้ใช้**

---

## ทดสอบ API

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# ดึงรายชื่อโครงการ (ต้องส่ง token)
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Health Check
curl http://localhost:5000/api/health
```

---

## วิธีรันพร้อมกัน (Development)

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm start
```

---

## Build สำหรับ Production

```bash
# Frontend
cd frontend
npm run build
# ไฟล์จะอยู่ที่ frontend/build/

# Backend — รันตรงๆ ด้วย Node.js
cd backend
npm start
```

---

## ปัญหาทั่วไป

| ปัญหา | วิธีแก้ |
|-------|---------|
| Port 5000 ถูกใช้อยู่ | แก้ `PORT=5001` ใน `.env` |
| CORS error | ตรวจสอบ `CORS_ORIGIN` ใน `.env` |
| npm modules not found | ลบ `node_modules` แล้วรัน `npm install` ใหม่ |
| Token หมดอายุ | Login ใหม่ หรือปรับ `JWT_EXPIRATION` |
| ฐานข้อมูลว่างเปล่า | รัน `node src/init-db.cjs` ใหม่ |

---

## ความปลอดภัย

1. ❌ **ห้าม** commit ไฟล์ `.env` ขึ้น Git
2. ✅ เปลี่ยน `JWT_SECRET` ให้เป็นค่าที่ปลอดภัย
3. ✅ ใช้ HTTPS ใน production
4. ✅ ระบบใช้ parameterized queries ป้องกัน SQL Injection อยู่แล้ว
