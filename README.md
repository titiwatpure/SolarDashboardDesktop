# Solar Dashboard - ระบบติดตามโครงการ Solar

ระบบ Web Application สำหรับติดตามและจัดการโครงการ Solar Rooftop และ Solar Plant ในประเทศไทย

## คุณสมบัติหลัก

### Dashboard
- **KPI Cards** แสดงจำนวนโครงการทั้งหมด เสร็จแล้ว กำลังดำเนินการ และติดปัญหา
- **Pipeline Visualization** แสดงการไหลของโครงการในแต่ละขั้นตอน
- **Project Table** ตารางรายละเอียดโครงการพร้อมการกรองข้อมูล

### การจัดการโครงการ
- เพิ่ม / แก้ไข / ลบ โครงการ
- ระบบ Workflow 7 ขั้นตอน: Survey -> Design -> ERC -> Grid -> Construction -> Testing -> COD
- สถานะโครงการ: ยังไม่เริ่ม, กำลังดำเนินการ, รอตรวจสอบ, ติดปัญหา, ถูกปฏิเสธ, เสร็จสิ้น
- Logic อัตโนมัติ: Step = COD -> Completed

### ระบบกฎหมายและใบอนุญาต
- <= 1000 kVA = แจ้งยกเว้น
- > 1000 kVA = ขอใบอนุญาต
- มีการขายไฟ = ต้องขอใบอนุญาต

### หน่วยงาน
รองรับหน่วยงานต่อไปนี้:
- กกพ. (ERC)
- PEA / MEA
- อบต./เทศบาล
- กรมโรงงาน
- นิคมอุตสาหกรรม

### จัดการเอกสาร
- **Upload ไฟล์จริง** รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP (สูงสุด 50MB)
- Drag-and-drop file upload
- ดาวน์โหลดไฟล์จากในระบบ
- ตรวจสอบและติดตามสถานะเอกสาร

### รายงาน
- สรุปตามสถานะ / ขนาด / จังหวัด / ขั้นตอน
- Export Excel / PDF

### ผู้ใช้งาน
- สิทธิ์ 4 ระดับ: Admin (เต็ม), Engineer (อ่าน/สร้าง/แก้ไข), Staff (จำกัด), Client (อ่านอย่างเดียว)
- ระบบ JWT Authentication + Refresh Token
- เปลี่ยนรหัสผ่านได้
- ระบบแจ้งเตือนอัตโนมัติ

### ระบบแจ้งเตือน
- แจ้งเตือนเมื่อสถานะโครงการเปลี่ยน
- แจ้งเตือนเมื่อมีงานถูกมอบหมาย
- Badge แสดงจำนวนแจ้งเตือนที่ยังไม่อ่าน (ดึงจาก API จริง)

### ตั้งค่า
- ดูข้อมูลผู้ใช้
- เปลี่ยนรหัสผ่าน
- ตั้งค่าการแจ้งเตือน

## การติดตั้ง

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# แก้ไขไฟล์ .env ตามสภาพแวดล้อมของคุณ
# สำคัญ: ตั้ง JWT_SECRET เป็นค่าที่ปลอดภัย
node src/init-db.cjs
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Docker (ทั้งระบบ)
```bash
# Build และ start ทั้ง backend + frontend
docker compose up -d --build

# ดู logs
docker compose logs -f

# หยุด
docker compose down
```

### Database
ระบบใช้ **SQLite** ไม่ต้องติดตั้ง PostgreSQL
ไฟล์ฐานข้อมูล: `backend/solar_dashboard.db`

## ข้อมูลเข้าสู่ระบบทดลอง

```
Username: admin
Password: admin
```

## UI/UX Design
- **โทนสี:**
  - น้ำเงินเข้ม (หลัก) #0066cc
  - เขียว (สำเร็จ) #10b981
  - เหลือง (กำลังดำเนินการ) #f59e0b
  - แดง (ปัญหา) #ef4444

- **Layout:**
  - Sidebar เมนูด้านซ้าย (dark theme)
  - Header ด้านบน sticky
  - Responsive Design (มือถือ + Desktop)
  - Card Design with Shadow

## โครงสร้างโปรเจกต์

```
Dashboard/
├── backend/
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.js       # Login + Register + Refresh Token
│   │   │   ├── projects.js   # Projects CRUD + KPI + Timeline
│   │   │   ├── users.js      # Users CRUD + Change Password
│   │   │   ├── documents.js  # Documents + File Upload (multer)
│   │   │   ├── organizations.js
│   │   │   ├── reports.js
│   │   │   ├── tasks.js
│   │   │   ├── notifications.js
│   │   │   ├── activity_logs.js
│   │   │   ├── checkpoints.js   # Checkpoint CRUD + Approve + Logs
│   │   │   └── backup.js        # Database backup/restore (Admin)
│   │   ├── models/
│   │   ├── middleware/       # JWT Auth + Role Authorization
│   │   ├── database.js      # SQLite connection
│   │   ├── init-db.cjs      # Database init + seed
│   │   └── index.js         # Express server
│   ├── uploads/             # Uploaded files
│   ├── __tests__/           # Jest + Supertest tests
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/         # React Context (AuthContext)
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── utils/           # API + Constants
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── README.md
└── .gitignore
```

## Technology Stack

### Backend
- Node.js 18 + Express.js
- SQLite3 Database
- JWT Authentication + Refresh Token
- bcrypt (12 rounds)
- multer (file upload)
- Helmet + CORS + Rate Limiting

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Lucide React Icons
- Recharts (charts)
- Axios (API)
- XLSX + jsPDF (export)

## API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ (return accessToken + refreshToken)
- `POST /api/auth/refresh` - ขอ accessToken ใหม่
- `POST /api/auth/logout` - ออกจากระบบ (invalidate refresh token)
- `POST /api/auth/register` - สร้างผู้ใช้ใหม่ (Admin)

### Projects
- `GET /api/projects` - รายชื่อโครงการ (pagination + filter)
- `GET /api/projects/:id` - รายละเอียดโครงการ
- `POST /api/projects` - สร้างโครงการ
- `PUT /api/projects/:id` - อัปเดตโครงการ
- `DELETE /api/projects/:id` - ลบโครงการ (Admin)
- `GET /api/projects/stats/kpis` - KPI stats
- `GET /api/projects/:id/timeline` - Timeline
- `DELETE /api/projects/:id/timeline/:timelineId` - ลบ timeline entry (Admin)
- `GET /api/projects/:id/organizations` - หน่วยงานที่เกี่ยวข้อง
- `POST /api/projects/:id/organizations` - เพิ่มหน่วยงานเข้าโครงการ
- `POST /api/projects/:id/organizations/:orgId/approve` - อนุมัติหน่วยงาน
- `POST /api/projects/:id/organizations/:orgId/reject` - ปฏิเสธหน่วยงาน
- `DELETE /api/projects/:id/organizations/:orgId` - ลบหน่วยงานออกจากโครงการ

### Users
- `GET /api/users` - รายชื่อผู้ใช้ (Admin)
- `GET /api/users/profile` - โปรไฟล์ปัจจุบัน
- `POST /api/users` - สร้างผู้ใช้ (Admin)
- `PUT /api/users/:id` - อัปเดตโปรไฟล์
- `PUT /api/users/change-password` - เปลี่ยนรหัสผ่าน
- `DELETE /api/users/:id` - ลบผู้ใช้ (Admin)

### Documents
- `GET /api/documents` - รายการเอกสาร
- `GET /api/documents/project/:id` - เอกสารตามโครงการ
- `POST /api/documents` - เพิ่มเอกสาร (รองรับ file upload)
- `GET /api/documents/download/:id` - ดาวน์โหลดไฟล์
- `DELETE /api/documents/:id` - ลบเอกสาร (Admin)

### Organizations
- `GET /api/organizations` - รายการหน่วยงาน
- `POST /api/organizations` - สร้างหน่วยงาน (Admin)
- `PUT /api/organizations/:id` - อัปเดต (Admin)
- `DELETE /api/organizations/:id` - ลบ (Admin)

### Tasks
- `GET /api/tasks` - รายการงาน
- `POST /api/tasks` - สร้างงาน
- `PUT /api/tasks/:id` - อัปเดตงาน
- `DELETE /api/tasks/:id` - ลบงาน (Admin)

### Notifications
- `GET /api/notifications` - แจ้งเตือน
- `GET /api/notifications/unread-count` - จำนวนที่ยังไม่อ่าน
- `PUT /api/notifications/:id/read` - อ่านแล้ว
- `PUT /api/notifications/read-all` - อ่านทั้งหมด

### Reports
- `GET /api/reports/summary/status` - สรุปตามสถานะ
- `GET /api/reports/summary/size` - สรุปตามขนาด
- `GET /api/reports/summary/province` - สรุปตามจังหวัด
- `GET /api/reports/summary/step` - สรุปตามขั้นตอน
- `GET /api/reports/summary/step-status` - สรุปสถานะตามขั้นตอน

### Activity Logs (Admin)
- `GET /api/activity-logs` - บันทึกกิจกรรม
- `GET /api/activity-logs/recent` - กิจกรรมล่าสุด

### Checkpoints
- `GET /api/projects/:projectId/checkpoints` - รายการ Checkpoint ตามโครงการ
- `POST /api/projects/:projectId/checkpoints` - สร้าง Checkpoint
- `PUT /api/checkpoints/:id` - อัปเดต Checkpoint
- `POST /api/checkpoints/:id/approve` - อนุมัติ Checkpoint
- `GET /api/checkpoints/:id/logs` - ประวัติการเปลี่ยนแปลง
- `DELETE /api/checkpoints/:id` - ลบ Checkpoint

### Backup (Admin)
- `POST /api/backup` - สำรองฐานข้อมูล
- `GET /api/backup` - รายการ backup
- `GET /api/backup/download/:name` - ดาวน์โหลดไฟล์ backup
- `POST /api/backup/restore/:name` - กู้คืนฐานข้อมูล
- `DELETE /api/backup/:name` - ลบไฟล์ backup

### System
- `GET /api/health` - สถานะเซิร์ฟเวอร์

## การรัน Tests

```bash
cd backend
npm test
```

## Responsive Design
- Mobile-first approach
- Sidebar ปิดอัตโนมัติบนมือถือ
- Navigation drawer สำหรับมือถือ
- ตารางสามารถเลื่อนได้บนมือถือ

## License

MIT License
