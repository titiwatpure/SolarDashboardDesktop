# Solar Dashboard - Installation & Setup Guide

## ข้อกำหนดระบบ (System Requirements)

- Node.js >= 16.0.0
- npm >= 8.0.0 หรือ yarn
- PostgreSQL >= 12.0
- Git

## ขั้นตอนการติดตั้ง (Installation Steps)

### 1. Database Setup

```bash
# สร้าง database
createdb solar_dashboard

# หรือใช้ psql
psql -U postgres
CREATE DATABASE solar_dashboard;
\q

# Import schema
psql -U postgres -d solar_dashboard -f backend/src/models/database-schema.sql

# (Optional) เพิ่มข้อมูลตัวอย่าง
psql -U postgres -d solar_dashboard -f backend/src/models/seed-data.sql
```

### 2. Backend Setup

```bash
# เข้าไปในโฟลเดอร์ backend
cd backend

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
cp .env.example .env

# แก้ไข .env ตามสภาพแวดล้อม
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_NAME=solar_dashboard

# รันเซิร์ฟเวอร์
npm run dev
# Server จะเริ่มที่ http://localhost:5000
```

### 3. Frontend Setup

```bash
# เข้าไปในโฟลเดอร์ frontend
cd frontend

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
cp .env.example .env

# รัน development server
npm start
# Application จะเปิดที่ http://localhost:3000
```

## ข้อมูลเข้าสู่ระบบทดลอง (Demo Credentials)

```
Username: admin
Password: admin
Role: Admin
```

## การสร้างผู้ใช้ใหม่ (Create New User)

### ผ่าน API
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "engineer1",
    "email": "engineer@example.com",
    "password": "password123",
    "full_name": "John Engineer",
    "role": "engineer"
  }'
```

### ผ่าน Database
```sql
-- Insert user directly (password must be hashed)
INSERT INTO users (id, username, email, password, full_name, role)
VALUES (gen_random_uuid(), 'engineer1', 'engineer@example.com', '$2b$10$...hashed_password...', 'John Engineer', 'engineer');
```

## ปัญหาทั่วไป (Troubleshooting)

### ✗ Connection refused to PostgreSQL
**วิธีแก้:**
```bash
# ตรวจสอบว่า PostgreSQL ทำงานอยู่
psql -U postgres -d postgres -c "SELECT 1;"

# หรือเริ่ม PostgreSQL service
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql

# Windows
# ใช้ Services app เพื่อเริ่ม PostgreSQL
```

### ✗ Port 5000 already in use
**วิธีแก้:**
```bash
# ค้นหา process ที่ใช้ port
lsof -i :5000

# หรือใช้ port อื่น
PORT=5001 npm run dev
```

### ✗ npm modules not found
**วิธีแก้:**
```bash
# ลบ node_modules และ lock file
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install
```

### ✗ CORS error
**วิธีแก้:**
```bash
# แก้ไขไฟล์ backend/src/index.js
# ตรวจสอบ CORS_ORIGIN ใน .env
CORS_ORIGIN=http://localhost:3000
```

## การพัฒนา (Development)

### เริ่มทำงาน (Running in Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Build for Production

**Backend:**
```bash
cd backend
# Build ตามที่ต้องการ หรือใช้เป็น Node.js app โดยตรง
```

**Frontend:**
```bash
cd frontend
npm run build
# สร้างไฟล์ใน build/ folder
```

## Database Migrations

### การเพิ่มตารางใหม่
```bash
# แก้ไข backend/src/models/database-schema.sql
# รันคำสั่ง
psql -U postgres -d solar_dashboard -c "CREATE TABLE ...;"
```

### การเปลี่ยนแปลงโครงสร้าง
```bash
# สร้างไฟล์ migration ใหม่
# หรือ execute SQL directly
psql -U postgres -d solar_dashboard -f migration-file.sql
```

## API Testing

### ใช้ Postman หรือ curl

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Get Projects (ต้องส่ง token)
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ตั้งค่า Environment Variables

### Backend (.env)
```
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solar_dashboard
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Performance Tips

### Backend
- ใช้ connection pooling
- Add database indexes
- Cache frequently accessed data

### Frontend
- Lazy load components
- Optimize images
- Code splitting with React.lazy()

## Security Considerations

1. **Never commit .env files** - ใช้ .env.example
2. **Use HTTPS in production**
3. **Validate input** - ทั้ง frontend และ backend
4. **Sanitize output** - ป้องกัน XSS
5. **SQL injection protection** - ใช้ parameterized queries
6. **Rate limiting** - ระบุการร้องขอมากเกินไป
7. **CSRF protection** - ใช้ tokens

## Deployment

### Deploy to Heroku

```bash
# Backend
heroku login
heroku create your-app-name-api
git push heroku main

# Frontend
npm run build
# Deploy build/ folder to Netlify หรือ Vercel
```

### Deploy to AWS/Azure
ดูรายละเอียดในเอกสารของแต่ละ platform

## Monitoring & Logging

```javascript
// ตัวอย่างการ log
console.log('User logged in:', userId);
console.error('Database error:', err);
```

## Support & Documentation

- Database Schema: [backend/src/models/database-schema.sql](backend/src/models/database-schema.sql)
- API Endpoints: [README.md](README.md#-api-endpoints)
- UI Components: [frontend/src/components/](frontend/src/components/)

---

**สำหรับข้อมูลเพิ่มเติม ดูไฟล์ README.md หลัก**
