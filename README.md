# Solar Dashboard - ระบบติดตามโครงการ Solar

ระบบ Web Application สำหรับติดตามและจัดการโครงการ Solar Rooftop และ Solar Plant ในประเทศไทย

## คุณสมบัติหลัก

### 📊 Dashboard
- **KPI Cards** แสดงจำนวนโครงการทั้งหมด เสร็จแล้ว กำลังดำเนินการ และติดปัญหา
- **Pipeline Visualization** แสดงการไหลของโครงการในแต่ละขั้นตอน
- **Project Table** ตารางรายละเอียดโครงการพร้อมการกรองข้อมูล

### 🏗️ การจัดการโครงการ
- เพิ่ม / แก้ไข / ลบ โครงการ
- ระบบ Workflow 7 ขั้นตอน: Survey → Design → ERC → Grid → Construction → Testing → COD
- สถานะโครงการ: Pending, In Progress, Blocked, Completed
- Logic อัตโนมัติ: Step = COD → Completed, ค้าง > 14 วัน → Blocked

### 📋 ระบบกฎหมายและใบอนุญาต
- ≤ 1000 kVA = แจ้งยกเว้น
- \> 1000 kVA = ขอใบอนุญาต
- มีการขายไฟ = ต้องขอใบอนุญาต

### 🏢 หน่วยงาน
รองรับหน่วยงานต่อไปนี้:
- กกพ. (ERC)
- PEA / MEA
- อบต./เทศบาล
- กรมโรงงาน
- นิคมอุตสาหกรรม

### 📄 จัดการเอกสาร
- Upload ไฟล์เอกสาร (SLD, ใบอนุญาต, Test Report)
- ตรวจสอบและติดตามสถานะเอกสาร

### 📈 รายงาน
- สรุปตามสถานะ
- สรุปตามขนาด (≤ / > 1MW)
- Export Excel / PDF

### 👥 ผู้ใช้งาน
- สิทธิ์ระดับ Admin และ Engineer
- ระบบ JWT Authentication
- สามารถจัดการผู้ใช้งานหลายคน

## 🚀 การติดตั้ง

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# แก้ไขไฟล์ .env ตามสภาพแวดล้อมของคุณ
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Database Setup
```bash
# สร้าง PostgreSQL database
psql -U postgres
CREATE DATABASE solar_dashboard;

# Import schema
psql -U postgres -d solar_dashboard -f backend/src/models/database-schema.sql
```

## 🎨 UI/UX Design
- **โทนสี:**
  - น้ำเงินเข้ม (หลัก) #0066cc
  - เขียว (สำเร็จ) #10b981
  - เหลือง (กำลังดำเนินการ) #f59e0b
  - แดง (ปัญหา) #ef4444

- **Layout:**
  - Sidebar เมนูด้านซ้าย
  - Header ด้านบน
  - พื้นที่แสดงผลหลักตรงกลาง
  - Card Design with Shadow
  - Grid Layout
  - Responsive Design

## 📁 โครงสร้างโปรเจกต์

```
Dashboard/
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Authentication
│   │   ├── controllers/   # Business logic
│   │   ├── database.js    # Database connection
│   │   └── index.js       # Server entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   ├── styles/        # CSS files
│   │   ├── App.jsx        # Main app component
│   │   └── index.js       # Entry point
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## 🔐 การทำงานของระบบ

### Authentication Flow
1. ผู้ใช้เข้าสู่ระบบด้วย username และ password
2. Backend ตรวจสอบข้อมูลและสร้าง JWT Token
3. Frontend เก็บ Token ใน localStorage
4. ทุก request ส่ง Token ใน Authorization header

### Project Workflow
1. ระบบตรวจสอบขนาด (kVA) และสิทธิ์การขายไฟ
2. กำหนดประเภทใบอนุญาตโดยอัตโนมัติ
3. สร้างขั้นตอนงาน 7 ขั้นตอน
4. ติดตามความคืบหน้าและอัปเดตสถานะ
5. เมื่อถึง COD จะตั้งสถานะเป็น Completed

## 📱 Responsive Design
- Mobile-first approach
- Sidebar ปิดอัตโนมัติบนมือถือ
- Navigation drawer สำหรับมือถือ
- ตารางสามารถเลื่อนได้บนมือถือ

## 🛠️ Technology Stack

### Backend
- Node.js + Express.js
- SQLite3 Database
- JWT Authentication
- CORS enabled

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Lucide React Icons
- Recharts for visualization
- Axios for API calls

## 📝 ข้อมูลเข้าสู่ระบบทดลอง

```
Username: admin
Password: admin
Role: Admin
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/register` - สร้างผู้ใช้ใหม่

### Projects
- `GET /api/projects` - ดึงรายชื่อโครงการ
- `GET /api/projects/:id` - ดึงรายละเอียดโครงการ
- `POST /api/projects` - สร้างโครงการใหม่
- `PUT /api/projects/:id` - อัปเดตโครงการ
- `DELETE /api/projects/:id` - ลบโครงการ
- `GET /api/projects/stats/kpis` - ดึง KPI

### Users
- `GET /api/users` - ดึงรายชื่อผู้ใช้ (Admin)
- `GET /api/users/profile` - ดึงโปรไฟล์ผู้ใช้ปัจจุบัน
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/:id` - อัปเดตโปรไฟล์
- `DELETE /api/users/:id` - ลบผู้ใช้

### Reports
- `GET /api/reports/summary/status` - สรุปตามสถานะ
- `GET /api/reports/summary/size` - สรุปตามขนาด
- `GET /api/reports/summary/province` - สรุปตามจังหวัด
- `GET /api/reports/summary/step` - สรุปตามขั้นตอน

## ✨ ส่วนขยายในอนาคต

- [ ] Real-time notification system
- [ ] Advanced reporting & analytics
- [ ] Integration with external APIs
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Advanced permission system
- [ ] Document storage integration
- [ ] Email notification

## 📄 License

MIT License

## 👨‍💻 Developer

สร้างสำหรับระบบติดตามโครงการ Solar ในประเทศไทย

---

**Note**: นี่คือระบบเวอร์ชันพื้นฐาน โดยมีคุณสมบัติเบื้องต้นทั้งหมดสำหรับการติดตามโครงการ Solar โปรแกรมเมอร์สามารถขยายและปรับปรุงระบบตามความต้องการจริง
