# Solar Dashboard - ระบบติดตามโครงการ Solar

ระบบ Web Application สำหรับติดตามและจัดการโครงการ Solar Rooftop และ Solar Plant ในประเทศไทย

## คุณสมบัติหลัก

### Dashboard
- **KPI Cards** แสดงจำนวนโครงการทั้งหมด, ประเภทใบอนุญาต, เสร็จแล้ว, ติดปัญหา, ความเสี่ยงสูง/วิกฤต
- **Pipeline Visualization** แสดงการไหลของโครงการในแต่ละขั้นตอน (7 ขั้นตอน) พร้อมสถานะแยกตามสี
- **Pie Chart** สัดส่วนสถานะโครงการโดยรวม

### การจัดการโครงการ
- เพิ่ม / แก้ไข / ลบ โครงการ
- ระบบ Workflow 7 ขั้นตอน: Survey -> Design -> ERC -> Grid -> Construction -> Testing -> COD
- สถานะโครงการ: ยังไม่เริ่ม, กำลังดำเนินการ, รอข้อมูล, ติดปัญหา, ถูกปฏิเสธ, เสร็จสิ้น
- **Status Transition Validation** -- บังคับการเปลี่ยนสถานะตาม State Machine
- **Scope Start/End** -- กำหนดช่วงขั้นตอนของแต่ละโครงการ (เช่น เริ่มจาก Grid ถึง COD)
- **Progress Calculation** -- คำนวณ % ความคืบหน้าอัตโนมัติตาม scope และ step ปัจจุบัน
- Logic อัตโนมัติ: Step = COD -> Completed

### ระบบ Checkpoint (จุดตรวจสอบ)
- **Auto-create Checkpoints** -- สร้างจุดตรวจสอบอัตโนมัติเมื่อเข้าขั้นตอนใหม่
  - Survey: สำรวจพื้นที่, ตรวจสอบโครงสร้างหลังคา, ประเมินระบบไฟฟ้า
  - Design: ออกแบบ Single Line Diagram, คำนวณขนาดระบบ, อนุมัติแบบ
  - ERC: ยื่นเอกสาร กกพ., ได้รับหนังสืออนุมัติ
  - Grid: ยื่นขอต่อสาย PEA/MEA, ได้รับอนุมัติต่อสาย, ติดตั้งมิเตอร์
  - Construction: ติดตั้งโครงสร้าง, ติดตั้งแผงโซลาร์, ติดตั้งอินเวอร์เตอร์, เดินสายไฟ
  - Testing: ทดสอบระบบ, ตรวจสอบความปลอดภัย, ทดสอบการจ่ายไฟ
  - COD: ส่งมอบงาน, อบรมการใช้งาน, ปิดโครงการ
- สถานะ Checkpoint: รอดำเนินการ, ผ่าน, ไม่ผ่าน, ข้าม
- ประวัติการเปลี่ยนแปลง (Checkpoint Logs)
- แจ้งเตือนอัตโนมัติเมื่อ Checkpoint ไม่ผ่าน
- **Recalculate Risk** อัตโนมัติเมื่อสถานะ Checkpoint เปลี่ยน

### ระบบความเสี่ยงอัตโนมัติ (Risk Detection)
ระบบคำนวณคะแนนความเสี่ยงจาก 5 ปัจจัย:
- **ความล่าช้า** (0-40 คะแนน) -- เปรียบเทียบเวลาที่ผ่านไปกับกำหนด COD
- **การติดปัญหา** (0-40 คะแนน) -- จำนวนวันที่อยู่สถานะ blocked
- **Checkpoint ไม่ผ่าน** (0-30 คะแนน) -- จำนวน Checkpoint ที่ failed
- **Task เกินกำหนด** (0-20 คะแนน) -- จำนวนงานที่ overdue
- **สถานะถูกปฏิเสธ** (0-20 คะแนน) -- สถานะ rejected

ระดับความเสี่ยง: ต่ำ (<25), ปานกลาง (25-49), สูง (50-79), วิกฤต (80+)

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

ระบบอนุมัติหน่วยงาน: pending -> approved / rejected (พร้อมเหตุผล)

### จัดการเอกสาร
- **Upload ไฟล์จริง** รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP/RAR (สูงสุด 50MB)
- Drag-and-drop file upload
- ดาวน์โหลดไฟล์จากในระบบ
- ตรวจสอบและติดตามสถานะเอกสาร

### รายงาน (9 ประเภท)
1. **สรุปตามสถานะ** -- Pie Chart สัดส่วนสถานะโครงการ
2. **สรุปตามขนาด** -- Bar Chart แยก <=1MW / >1MW
3. **สรุปตามจังหวัด** -- ตารางจำนวนโครงการ + % เสร็จสิ้นต่อจังหวัด
4. **สรุปตามขั้นตอน** -- Horizontal Bar Chart
5. **สรุปขั้นตอน + สถานะ** -- Pipeline Data
6. **ประวัติความคืบหน้า** -- ตาราง Timeline ทั้งหมดพร้อม Pagination + ค้นหา
7. **รายงานความเสี่ยง** -- โครงการที่มีความเสี่ยงสูง/วิกฤต
8. **ระยะเวลาแต่ละขั้นตอน** -- ค่าเฉลี่ยวันที่ใช้ในแต่ละ Step
9. **ผลงานรายบุคคล** -- สถิติผลงานต่อผู้รับผิดชอบ
10. **สรุปงานที่มอบหมาย** -- สถิติ Task ตาม Priority/Status + จำนวน Overdue

- Export Excel (XLSX) / PDF รองรับภาษาไทย (ฟอนต์ Sarabun)
- **รายงานรายโครงการ** (`/projects/:id/report`) -- รายงานละเอียดของแต่ละโครงการพร้อม PDF Export + Print

### Timeline & ความคิดเห็น
- บันทึกการเปลี่ยนแปลงสถานะ/ขั้นตอนอัตโนมัติ
- **แสดงความคิดเห็น** ในแต่ละ Timeline Entry
- แจ้งเตือนอัตโนมัติเมื่อมีคนแสดงความคิดเห็น (ส่งถึงผู้สร้าง Timeline, ผู้รับผิดชอบ, และผู้แสดงความคิดเห็นก่อนหน้า)

### ระบบงาน (Tasks)
- สร้าง / แก้ไข / ลบ งาน
- Priority: ต่ำ, ปานกลาง, สูง, เร่งด่วน
- สถานะ: รอดำเนินการ, กำลังทำ, เสร็จแล้ว, ยกเลิก
- มอบหมายงานให้ผู้ใช้ + แจ้งเตือนอัตโนมัติ
- ติดตามงานเกินกำหนด (Overdue)

### ผู้ใช้งาน
- สิทธิ์ 4 ระดับ: Admin (เต็ม), Engineer (อ่าน/สร้าง/แก้ไข), Staff (จำกัด), Client (อ่านอย่างเดียว)
- **Granular Permissions** -- กำหนดสิทธิ์ละเอียด เช่น `project.create`, `project.delete`, `approval.manage`, `checkpoint.approve`
- ระบบ JWT Authentication + Refresh Token (Token Rotation)
- เปลี่ยนรหัสผ่านได้
- Login Rate Limiting (20 ครั้ง / 15 นาที)
- ระบบแจ้งเตือนอัตโนมัติ

### ระบบแจ้งเตือน
- แจ้งเตือนเมื่อสถานะโครงการเปลี่ยน
- แจ้งเตือนเมื่อมีงานถูกมอบหมาย
- แจ้งเตือนเมื่อมีความคิดเห็นใหม่ใน Timeline
- แจ้งเตือนเมื่อ Checkpoint ไม่ผ่าน
- Badge แสดงจำนวนแจ้งเตือนที่ยังไม่อ่าน
- อ่านทีละรายการ / อ่านทั้งหมด

### บันทึกกิจกรรม (Activity Logs)
- บันทึกการกระทำทั้งหมดในระบบอัตโนมัติ
- ระดับความรุนแรง: info / warning / error
- ติดตาม IP Address
- กรองตามผู้ใช้, การกระทำ, ประเภท, ความรุนแรง

### สำรองข้อมูล (Backup/Restore)
- สำรองฐานข้อมูลเป็นไฟล์
- กู้คืนฐานข้อมูล (สร้าง backup ก่อน restore อัตโนมัติ)
- จัดการไฟล์ backup (list/download/delete)

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
cp .env.example .env
npm start
```

### Docker (Development)
```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

### Docker (Production)
```bash
docker compose -f docker-compose.production.yml up -d
```

### Database
ระบบใช้ **SQLite** ไม่ต้องติดตั้ง PostgreSQL
ไฟล์ฐานข้อมูล: `backend/solar_dashboard.db`

## ข้อมูลเข้าสู่ระบบทดลอง

| Username | Password | Role |
|----------|----------|------|
| admin | admin | Admin |
| engineer | engineer | Engineer |
| staff | staff | Staff |
| client | client | Client |

## UI/UX Design
- **โทนสี:**
  - น้ำเงินเข้ม (หลัก) #0066cc
  - เขียว (สำเร็จ) #10b981
  - เหลือง (กำลังดำเนินการ) #f59e0b
  - แดง (ปัญหา) #ef4444

- **Layout:**
  - Sidebar เมนูด้านซ้าย (dark theme, collapsible)
  - Header ด้านบน sticky พร้อม notification badge
  - Responsive Design (มือถือ + Desktop)
  - Card Design with Shadow
  - Toast Notification System (success/error/warning/info)

## โครงสร้างโปรเจกต์

```
Dashboard/
├── backend/
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.js          # Login + Register + Refresh Token + Logout All
│   │   │   ├── projects.js      # Projects CRUD + KPI + Timeline + Organizations
│   │   │   ├── users.js         # Users CRUD + Change Password
│   │   │   ├── documents.js     # Documents + File Upload (multer)
│   │   │   ├── organizations.js # Organizations CRUD + Projects link
│   │   │   ├── reports.js       # 10 Report endpoints
│   │   │   ├── tasks.js         # Tasks CRUD + Notifications
│   │   │   ├── notifications.js # Notifications CRUD
│   │   │   ├── activity_logs.js # Activity logging
│   │   │   ├── checkpoints.js   # Checkpoint CRUD + Approve + Logs
│   │   │   └── backup.js        # Database backup/restore (Admin)
│   │   ├── services/
│   │   │   └── riskDetection.js # Automated risk scoring engine
│   │   ├── models/
│   │   ├── middleware/          # JWT Auth + Role + Permission Authorization
│   │   ├── utils/
│   │   │   └── errors.js        # Custom AppError class
│   │   ├── database.js          # SQLite connection (pool interface)
│   │   ├── init-db.cjs          # Database init + seed (16 tables)
│   │   └── index.js             # Express server
│   ├── uploads/                 # Uploaded files
│   ├── __tests__/               # Jest + Supertest tests
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/             # AuthContext (login/logout/token)
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   ├── Header.jsx       # Top header + notifications
│   │   │   ├── KPICards.jsx     # 6 KPI cards
│   │   │   ├── Pipeline.jsx     # Pipeline visualization
│   │   │   ├── ProjectsTable.jsx
│   │   │   ├── ProjectModal.jsx # Create/Edit project
│   │   │   ├── StatusModal.jsx  # Status change
│   │   │   ├── RiskBadge.jsx    # Risk level badge
│   │   │   └── Toast.jsx        # Toast notifications
│   │   ├── pages/
│   │   │   ├── Login.jsx        # /login
│   │   │   ├── Dashboard.jsx    # / (KPI + Pipeline)
│   │   │   ├── Projects.jsx     # /projects (list + filter + pagination)
│   │   │   ├── ProjectDetail.jsx # /projects/:id (detail + checkpoints + timeline)
│   │   │   ├── ProjectReport.jsx # /projects/:id/report (single project report)
│   │   │   ├── Steps.jsx        # /steps (pipeline visualization)
│   │   │   ├── Tasks.jsx        # /tasks (task management)
│   │   │   ├── Documents.jsx    # /documents (file management)
│   │   │   ├── Organizations.jsx # /organizations
│   │   │   ├── Reports.jsx      # /reports (9 report sections)
│   │   │   ├── Users.jsx        # /users (admin)
│   │   │   └── Settings.jsx     # /settings
│   │   ├── utils/
│   │   │   ├── api.js           # API client + auto token refresh
│   │   │   ├── constants.js     # Thai labels + constants
│   │   │   └── thaiFont.js      # Sarabun font for PDF
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Development
├── docker-compose.production.yml # Production (GHCR images)
├── README.md
└── .gitignore
```

## Technology Stack

### Backend
- Node.js 18 + Express.js
- SQLite3 Database
- JWT Authentication + Refresh Token (Token Rotation)
- bcrypt (12 rounds)
- multer (file upload, max 50MB)
- Helmet + CORS + Rate Limiting
- Jest + Supertest (testing)

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Lucide React Icons
- Recharts (charts)
- Axios (API + auto token refresh interceptor)
- XLSX + jsPDF (export with Thai font support)

## API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ (return accessToken + refreshToken)
- `POST /api/auth/refresh` - ขอ accessToken ใหม่ (token rotation)
- `POST /api/auth/logout` - ออกจากระบบ (invalidate refresh token)
- `POST /api/auth/logout-all` - ออกจากระบบทุกอุปกรณ์
- `POST /api/auth/register` - สร้างผู้ใช้ใหม่ (Admin)

### Projects
- `GET /api/projects/stats/kpis` - KPI stats
- `GET /api/projects` - รายชื่อโครงการ (pagination + filter)
- `GET /api/projects/:id` - รายละเอียดโครงการ
- `POST /api/projects` - สร้างโครงการ
- `PUT /api/projects/:id` - อัปเดตโครงการ
- `DELETE /api/projects/:id` - ลบโครงการ

### Project Organizations
- `GET /api/projects/:id/organizations` - หน่วยงานที่เกี่ยวข้อง
- `POST /api/projects/:id/organizations` - เพิ่มหน่วยงานเข้าโครงการ
- `POST /api/projects/:id/organizations/:orgId/approve` - อนุมัติหน่วยงาน
- `POST /api/projects/:id/organizations/:orgId/reject` - ปฏิเสธหน่วยงาน
- `DELETE /api/projects/:id/organizations/:orgId` - ลบหน่วยงานออกจากโครงการ

### Project Timeline
- `GET /api/projects/:id/timeline` - Timeline (with comment counts)
- `DELETE /api/projects/:id/timeline/:timelineId` - ลบ timeline entry (Admin)
- `GET /api/projects/:id/timeline/:timelineId/comments` - ความคิดเห็น
- `POST /api/projects/:id/timeline/:timelineId/comments` - เพิ่มความคิดเห็น
- `DELETE /api/projects/:id/timeline/:timelineId/comments/:commentId` - ลบความคิดเห็น

### Checkpoints
- `GET /api/projects/:projectId/checkpoints` - รายการ Checkpoint
- `POST /api/projects/:projectId/checkpoints` - สร้าง Checkpoint
- `PUT /api/checkpoints/:id` - อัปเดต Checkpoint
- `POST /api/checkpoints/:id/approve` - อนุมัติ Checkpoint
- `GET /api/checkpoints/:id/logs` - ประวัติการเปลี่ยนแปลง
- `DELETE /api/checkpoints/:id` - ลบ Checkpoint

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
- `POST /api/documents` - เพิ่มเอกสาร (file upload)
- `GET /api/documents/download/:id` - ดาวน์โหลดไฟล์
- `DELETE /api/documents/:id` - ลบเอกสาร (Admin)

### Organizations
- `GET /api/organizations` - รายการหน่วยงาน
- `GET /api/organizations/:id/projects` - โครงการที่เชื่อมกับหน่วยงาน
- `POST /api/organizations` - สร้างหน่วยงาน (Admin)
- `PUT /api/organizations/:id` - อัปเดต (Admin)
- `DELETE /api/organizations/:id` - ลบ (Admin)

### Tasks
- `GET /api/tasks` - รายการงาน (pagination + filter)
- `GET /api/tasks/:id` - รายละเอียดงาน
- `POST /api/tasks` - สร้างงาน
- `PUT /api/tasks/:id` - อัปเดตงาน
- `DELETE /api/tasks/:id` - ลบงาน (Admin)

### Notifications
- `GET /api/notifications` - แจ้งเตือน
- `GET /api/notifications/unread-count` - จำนวนที่ยังไม่อ่าน
- `PUT /api/notifications/:id/read` - อ่านแล้ว
- `PUT /api/notifications/read-all` - อ่านทั้งหมด
- `DELETE /api/notifications/:id` - ลบแจ้งเตือน

### Reports
- `GET /api/reports/summary/status` - สรุปตามสถานะ
- `GET /api/reports/summary/size` - สรุปตามขนาด
- `GET /api/reports/summary/province` - สรุปตามจังหวัด
- `GET /api/reports/summary/step` - สรุปตามขั้นตอน
- `GET /api/reports/summary/step-status` - สรุปขั้นตอน + สถานะ
- `GET /api/reports/summary/timeline` - ประวัติความคืบหน้าทั้งหมด
- `GET /api/reports/summary/risk` - รายงานความเสี่ยง
- `GET /api/reports/summary/lead-time` - ระยะเวลาเฉลี่ยแต่ละขั้นตอน
- `GET /api/reports/summary/performance` - ผลงานรายบุคคล
- `GET /api/reports/summary/tasks` - สรุปงานที่มอบหมาย

### Activity Logs (Admin)
- `GET /api/activity-logs` - บันทึกกิจกรรม
- `GET /api/activity-logs/recent` - กิจกรรมล่าสุด
- `POST /api/activity-logs` - สร้าง log ด้วยตนเอง

### Backup (Admin)
- `POST /api/backup` - สำรองฐานข้อมูล
- `GET /api/backup` - รายการ backup
- `GET /api/backup/download/:name` - ดาวน์โหลดไฟล์ backup
- `POST /api/backup/restore/:name` - กู้คืนฐานข้อมูล
- `DELETE /api/backup/:name` - ลบไฟล์ backup

### System
- `GET /api/health` - สถานะเซิร์ฟเวอร์ + DB connectivity

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
