# Solar Dashboard - คู่มือการติดตั้ง

## ข้อกำหนดระบบ

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

> ระบบนี้ใช้ **SQLite** เป็นฐานข้อมูล ไม่ต้องติดตั้ง PostgreSQL

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
JWT_SECRET=เปลี่ยนเป็นค่าที่ปลอดภัย
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=30
CORS_ORIGIN=http://localhost:3000
```

สร้างฐานข้อมูลและ seed ข้อมูลตัวอย่าง:

```bash
# สร้างตาราง + seed ผู้ใช้และหน่วยงาน
node src/init-db.cjs

# (ทางเลือก) seed ข้อมูลโครงการตัวอย่าง 4 โครงการ
node src/seed-projects.cjs
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

## ติดตั้งด้วย Docker

### Development
```bash
# ทั้ง backend + frontend
docker compose up -d --build

# ดู logs
docker compose logs -f

# หยุด
docker compose down
```

### Production (ใช้ pre-built images จาก GHCR)
```bash
docker compose -f docker-compose.production.yml up -d
```

---

## ข้อมูลเข้าสู่ระบบทดลอง

| Username | Password | บทบาท |
|----------|----------|-------|
| admin | admin | Admin |
| engineer | engineer | Engineer |
| staff | staff | Staff |
| client | client | Client |

---

## ตั้งค่า Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=เปลี่ยนเป็นค่าที่ปลอดภัย
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=30
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env`)
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

### ข้อมูลไม่หายเมื่อรันซ้ำ
- ใช้ `CREATE TABLE IF NOT EXISTS` - ถ้าตารางมีอยู่แล้วไม่ทำอะไร
- ใช้ `INSERT OR IGNORE` - ถ้าข้อมูลมีอยู่แล้วไม่เขียนทับ
- ข้อมูลที่คุณบันทึกเองจะอยู่ครบ

### Backup ฐานข้อมูล
```bash
cp backend/solar_dashboard.db backend/solar_dashboard_backup.db
```

---

## การสร้างผู้ใช้ใหม่

### ผ่าน API (ต้อง Login เป็น Admin ก่อน)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"username":"engineer1","email":"eng@example.com","password":"pass1234","full_name":"Engineer One","role":"engineer"}'
```

### ผ่านหน้า Users ในระบบ
เข้าเมนู **ผู้ใช้งาน** -> กดปุ่ม **เพิ่มผู้ใช้**

---

## การอัปเดตแอป

```bash
# 1. ดึงโค้ดใหม่
git pull

# 2. ลง dependencies ใหม่ (ถ้ามี)
cd backend && npm install
cd ../frontend && npm install

# 3. รัน init-db (ถ้ามีตารางใหม่)
cd ../backend && node src/init-db.cjs

# 4. รันใหม่
npm run dev
```

> ข้อมูลเดิมใน `solar_dashboard.db` ไม่หาย

---

## Deploy บน Render.com

### Backend (Web Service)
1. สร้าง Web Service จาก GitHub repo
2. Build Command: `cd backend && npm install`
3. Start Command: `cd backend && node src/init-db.cjs && npm start`
4. Environment Variables:
   - `PORT` = 10000
   - `JWT_SECRET` = (ค่าที่ปลอดภัย)
   - `CORS_ORIGIN` = URL ของ Frontend
5. **เพิ่ม Persistent Disk** ที่ `/var/data` เพื่อเก็บ SQLite database ไม่ให้หาย

### Frontend (Static Site)
1. สร้าง Static Site จาก GitHub repo
2. Build Command: `cd frontend && npm install && npm run build`
3. Publish Directory: `frontend/build`
4. Environment Variables:
   - `REACT_APP_API_URL` = URL ของ Backend + `/api`

> **หมายเหตุ**: SQLite บน Render จะหายทุกครั้งที่ deploy ถ้าไม่ใช้ Persistent Disk

---

## Build สำหรับ Production

```bash
# Frontend
cd frontend
npm run build

# Backend serve frontend ด้วย
cd backend
NODE_ENV=production node src/index.js
# เปิด http://localhost:5000
```

---

## รัน Tests

```bash
cd backend
npm test
```

---

## ปัญหาทั่วไป

| ปัญหา | วิธีแก้ |
|-------|---------|
| Port 5000 ถูกใช้อยู่ | แก้ `PORT=5001` ใน `.env` |
| CORS error | ตรวจสอบ `CORS_ORIGIN` ใน `.env` |
| npm modules not found | ลบ `node_modules` แล้วรัน `npm install` ใหม่ |
| Token หมดอายุ | Login ใหม่ (ระบบมี refresh token อัตโนมัติ) |
| ฐานข้อมูลว่างเปล่า | รัน `node src/init-db.cjs` ใหม่ |
| Upload ไฟล์ไม่ได้ | ตรวจสอบว่ามีโฟลเดอร์ `backend/uploads/` |

---

## ความปลอดภัย

1. **ห้าม** commit ไฟล์ `.env` ขึ้น Git (อยู่ใน `.gitignore` แล้ว)
2. เปลี่ยน `JWT_SECRET` ให้เป็นค่าที่ปลอดภัย
3. ใช้ HTTPS ใน production
4. ระบบใช้ parameterized queries ป้องกัน SQL Injection
5. Rate limiting: 200 req/min ทั่วไป, 20 req/15min สำหรับ login
6. bcrypt 12 rounds สำหรับรหัสผ่าน
7. JWT HS256 + Refresh Token rotation
