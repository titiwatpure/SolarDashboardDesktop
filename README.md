# Solar Dashboard - ระบบจัดการเอกสารสำหรับ Solar Rooftop

ระบบ Web Application สำหรับจัดการเอกสาร ใบอนุญาต และติดตามโครงการ Solar Rooftop ในประเทศไทย

## คุณสมบัติหลัก

### Dashboard (หน้าหลัก)
- **KPI Cards** แสดงจำนวนโครงการทั้งหมด, สถานะใบอนุญาต, เสร็จแล้ว, ติดปัญหา, ความเสี่ยงสูง/วิกฤต
- **Pipeline Visualization** แสดงการไหลของโครงการในแต่ละขั้นตอน (7 ขั้นตอน) พร้อมสถานะแยกตามสี
- **Pie Chart** สัดส่วนสถานะโครงการโดยรวม
- **Risk Detection** ระบบคำนวณคะแนนความเสี่ยงอัตโนมัติ

### ระบบจัดการโครงการ
- เพิ่ม / แก้ไข / ลบ โครงการ
- **Workflow 7 ขั้นตอน**: Survey → Design → ERC → Grid → Construction → Testing → COD
- **Scope Start/End** กำหนดช่วงขั้นตอนของแต่ละโครงการ (เช่น เริ่มจาก Grid ถึง COD)
- **Service Type** ประเภทงาน: document_only, document_erc, full, custom
- **Progress Calculation** คำนวณ % ความคืบหน้า = step position (50%) + checkpoint completion (50%)
- ข้อมูลลูกค้า, สถานที่ติดตั้ง, สัญญา/การเงิน, สเปคเทคนิค (ไม่บังคับ)

### ระบบ Checkpoint (จุดตรวจสอบ)
- Auto-create Checkpoints เมื่อเข้าขั้นตอนใหม่
- สถานะ: รอดำเนินการ, ผ่าน, ไม่ผ่าน, ข้าม
- Recalculate Risk อัตโนมัติเมื่อสถานะ Checkpoint เปลี่ยน
- ประวัติการเปลี่ยนแปลง (Checkpoint Logs)

### ระบบความเสี่ยงอัตโนมัติ (Risk Detection)
ระบบคำนวณคะแนนความเสี่ยงจาก 5 ปัจจัย:
- **ความล่าช้า** (0-40 คะแนน) — เปรียบเทียบเวลาที่ผ่านไปกับกำหนด COD
- **การติดปัญหา** (0-40 คะแนน) — จำนวนวันที่อยู่สถานะ blocked
- **Checkpoint ไม่ผ่าน** (0-30 คะแนน) — จำนวน Checkpoint ที่ failed
- **Task เกินกำหนด** (0-20 คะแนน) — จำนวนงานที่ overdue
- **สถานะถูกปฏิเสธ** (0-20 คะแนน) — สถานะ rejected

ระดับความเสี่ยง: ต่ำ (<25), ปานกลาง (25-49), สูง (50-79), วิกฤต (80+)

---

## ระบบตรวจเอกสาร (Doc Review)

### Dashboard ตรวจเอกสาร (`/doc-review`)
- **Summary Cards** แสดงสถิติ package ทั้งหมด, สถานะ, % เสร็จ
- **Package Table** ตาราง package พร้อม status badges
- **Filter** ตาม status, permit type, agency

### สถานะเอกสาร (Document Status Flow)
- **waiting_documents** → รอเอกสาร
- **internal_review** → ตรวจสอบภายใน
- **customer_revision** → ลูกค้าแก้ไข
- **ready_to_submit** → พร้อมส่ง
- **submitted_agency** → ส่งแล้ว
- **agency_revision** → ให้แก้ไข
- **approved** → อนุมัติแล้ว

### Checklist Management
- **Template Checklists** template เช็คลิสต์สำหรับ COP, ใบอนุญาต, เอกสารแต่ละประเภท
- **Batch Operations** — รับเอกสารหลายคน, อนุมัติหลายคน, ปฏิเสธหลายคน, บังคับผ่านหลายคน
- **Recalculate Status** `recalculatePackageStatus()` อัปเดตสถานะอัตโนมัติจาก checklist items

### ฟีเจอร์ใหม่ (v1.2.0)

#### เอกสารต้องแก้ (`/doc-review/pending-revisions`)
- รวม checklist ที่ status=customer_revision ทุกโครงการไว้หน้าเดียว
- แสดงชื่อโครงการ, ประเภทเอกสาร, วันที่แก้ไข

#### สรุปส่งหน่วยงานวันนี้ (`/doc-review/ready-to-submit`)
- Checklist ที่ status=passed แต่ยังไม่ได้ยื่นหน่วยงาน
- แสดง submission_count เพื่อดูว่ายื่นไปแล้วหรือยัง

#### ปัญหาเอกสาร (`/doc-review/open-issues`)
- รวมปัญหาที่ status=open ทุก package
- แสดง project_code, permit_type, created_by_name

### ติดตามยื่นหน่วยงาน (Agency Tracking)
- **Submit to Agency** ยื่นเอกสารให้หน่วยงาน (กกพ., PEA, MEA, ฯลฯ)
- **Submission Rounds** ติดตามรอบการยื่น (round 1, 2, 3...) ต่อ package/agency
- **Latest Round Display** แสดงเฉพาะรอบล่าสุดต่อ package/agency
- **Expand History** กดดูประวัติย้อนหลังทั้งหมด

### ตารางติดตามใบอนุญาต (`/doc-review/permit-tracking`)
- สรุปสถานะใบอนุญาตทุกโครงการในหน้าเดียว
- คอลัมน์: Priority No., Project, Name, Capacity, CoP, ESA, Act./DEAT, Ring/DEAT, ERC, DEDE, PEA
- สถานะ: Done, N/A, ไม่ได้ดำเนินการ, On Process, ส่งแล้ว, อยู่ระหว่างแก้ไข

---

## ระบบอื่นๆ

### รายงาน (Reports)
1. สรุปตามสถานะ — Pie Chart
2. สรุปตามขนาด — Bar Chart
3. สรุปตามจังหวัด — ตาราง
4. สรุปตามขั้นตอน — Horizontal Bar Chart
5. สรุปขั้นตอน + สถานะ — Pipeline Data
6. ประวัติความคืบหน้า — Timeline พร้อม Pagination + ค้นหา
7. รายงานความเสี่ยง — โครงการที่มีความเสี่ยงสูง/วิกฤต
8. ระยะเวลาแต่ละขั้นตอน — ค่าเฉลี่ยวัน
9. ผลงานรายบุคคล — สถิติผลงานต่อผู้รับผิดชอบ
10. สรุปงานที่มอบหมาย — สถิติ Task ตาม Priority/Status

Export: Excel (XLSX) / PDF รองรับภาษาไทย (ฟอนต์ Sarabun)

### ระบบงาน (Tasks)
- สร้าง / แก้ไข / ลบ งาน
- Priority: ต่ำ, ปานกลาง, สูง, เร่งด่วน
- สถานะ: รอดำเนินการ, กำลังทำ, เสร็จแล้ว, ยกเลิก
- มอบหมายงาน + แจ้งเตือนอัตโนมัติ
- ปฏิทินงาน (4 มุมมอง: วัน/สัปดาห์/เดือน/ปี)

### ลูกค้า (Customers)
- จัดการข้อมูลลูกค้า (บุคคลธรรมดา / นิติบุคคล / หน่วยงานราชการ)
- ข้อมูลติดต่อ, เลขประจำตัวผู้เสียภาษี, ที่อยู่
- เชื่อมกับหลายโครงการ

### หน่วยงาน (Organizations)
- รองรับ: กกพ. (ERC), PEA / MEA, อบต./เทศบาล, กรมโรงงาน, นิคมอุตสาหกรรม
- ระบบอนุมัติหน่วยงาน: pending → approved / rejected
- เจ้าหน้าที่หน่วยงาน (Organization Contacts)

### สัญญา (Contracts)
- สร้าง/แก้ไข/ลบ สัญญา
- สถานะ: ร่าง, มีผล, เสร็จสิ้น, ยกเลิก
- เชื่อมกับโครงการและลูกค้า

### ใบเสนอราคา (Quotations)
- สร้าง/แก้ไข/ลบ ใบเสนอราคา
- สถานะ: ร่าง, ส่งแล้ว, อนุมัติ, ปฏิเสธ, หมดอายุ
- คำนวณภาษีอัตโนมัติ

### ระบบบัญชี (Accounting)
- หมวดหมู่บัญชี รายรับ/รายจ่าย พร้อมไอคอน
- บันทึกรายรับ-รายจ่าย ผูกกับโครงการ
- งวดชำระ สร้างงวดจากสัญญา, ชำระเต็ม/บางส่วน
- สรุปการเงิน — รายรับรวม, รายจ่ายรวม, กำไร, ยอดค้างชำระ
- ส่งออก CSV

### ผู้ใช้งาน (Users)
- สิทธิ์ 4 ระดับ: Admin, Engineer, Staff, Client
- Granular Permissions กำหนดสิทธิ์ละเอียด
- JWT Authentication + Refresh Token (Token Rotation)
- Login Rate Limiting (dev mode: ไม่จำกัด)

### ระบบแจ้งเตือน
- แจ้งเตือนเมื่อสถานะโครงการเปลี่ยน
- แจ้งเตือนเมื่อมีงานถูกมอบหมาย
- แจ้งเตือนเมื่อมีความคิดเห็นใหม่
- แจ้งเตือนเมื่อ Checkpoint ไม่ผ่าน

### Timeline (ประวัติการดำเนินงาน)
- Vertical Timeline Thailand Post style (green checkmarks, dashed lines)
- Event types: received, passed, failed, revision, issue, submitted
- ความคิดเห็นในแต่ละ Timeline Entry

### สำรองข้อมูล (Backup/Restore)
- สำรอง/กู้คืนฐานข้อมูล
- Manual + Auto backup modes
- จัดการไฟล์ backup (list/download/delete)

### แผนที่เครือข่าย (Network Map)
- แสดงตำแหน่งโครงการบนแผนที่ (Leaflet)
- ค้นหา + Filter ตามสถานะ/ภูมิภาค

### พอร์ทัลลูกค้า (Customer Portal)
- หน้าสรุปสำหรับลูกค้า
- ดูโครงการ, สัญญา, เอกสาร ของตัวเอง

---

## การติดตั้ง

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# แก้ไขไฟล์ .env ตามสภาพแวดล้อมของคุณ
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

### รันทั้งสอง (Development)
```bash
cd backend && npx nodemon --watch src --ext js,json src/index.js
cd frontend && npm start
```

### Database
- **SQLite** ไม่ต้องติดตั้ง PostgreSQL
- ไฟล์: `backend/solar_dashboard.db`
- WAL mode สำหรับ concurrent read/write
- 12 migrations (001-012, 009 skipped)
- 44 tables, 95+ indexes

## ข้อมูลเข้าสู่ระบบทดลอง

| Username | Password | Role |
|----------|----------|------|
| admin | admin | Admin |
| engineer | engineer | Engineer |
| staff | staff | Staff |
| client | client | Client |

---

## โครงสร้างโปรเจกต์

```
Dashboard/
├── backend/
│   ├── src/
│   │   ├── routes/              # API endpoints (29 files)
│   │   │   ├── auth.js          # Login + Register + Refresh Token
│   │   │   ├── projects.js      # Projects CRUD + KPI + Progress
│   │   │   ├── checkpoints.js   # Checkpoint CRUD + Approve
│   │   │   ├── tasks.js         # Tasks CRUD + Notifications
│   │   │   ├── reports.js       # 10 Report endpoints
│   │   │   ├── doc-review-checklists.js  # Checklist + batch ops + new endpoints
│   │   │   ├── doc-review-packages.js    # Package management
│   │   │   ├── doc-review-submissions.js # Agency submissions
│   │   │   ├── permit-tracking.js        # Permit tracking summary
│   │   │   └── ... (20+ more)
│   │   ├── services/
│   │   │   ├── riskDetection.js # Risk scoring engine
│   │   │   └── maintenance.js   # DB maintenance
│   │   ├── migrations/          # 12 migrations
│   │   ├── middleware/          # JWT Auth + Role + Permission
│   │   ├── database.js          # SQLite connection
│   │   ├── init-db.cjs          # Database init + seed
│   │   └── index.js             # Express server
│   └── uploads/                 # Uploaded files
├── frontend/
│   ├── src/
│   │   ├── pages/               # 30 pages
│   │   │   ├── Dashboard.jsx    # /
│   │   │   ├── Projects.jsx     # /projects
│   │   │   ├── DocReviewDashboard.jsx  # /doc-review
│   │   │   ├── DocumentsToRevise.jsx   # /doc-review/pending-revisions
│   │   │   ├── ReadyToSubmit.jsx       # /doc-review/ready-to-submit
│   │   │   ├── OpenIssues.jsx          # /doc-review/open-issues
│   │   │   └── ... (25+ more)
│   │   ├── components/          # 13 components
│   │   │   ├── Sidebar.jsx      # Navigation (6 groups)
│   │   │   ├── KPICards.jsx     # KPI cards
│   │   │   ├── Pipeline.jsx     # Pipeline visualization
│   │   │   └── PermitTrackingTable.jsx # Permit tracking
│   │   ├── context/             # Auth + AppSettings
│   │   ├── utils/api.js         # API client + documentReviewAPI
│   │   └── App.jsx              # Router + Lazy loading
│   └── build/                   # Production build
├── mockups/                     # 19 HTML mockups
├── .mimocode/skills/            # Agent skills
└── package.json                 # Electron app
```

## Technology Stack

### Backend
- Node.js + Express.js
- SQLite3 (WAL mode)
- JWT Authentication + Refresh Token (Token Rotation)
- bcryptjs (12 rounds)
- multer (file upload)
- Helmet + CORS + Rate Limiting (dev: disabled)

### Frontend
- React 18 + React Router v6
- Tailwind CSS
- Lucide React Icons
- Recharts (charts)
- Axios (API + auto token refresh)
- XLSX + jsPDF (export with Thai font)
- React-Leaflet (map)

### Desktop App
- Electron
- electron-builder
- electron-updater (auto-update via GitHub Releases)

---

## API Endpoints (หลัก)

### Authentication
- `POST /api/auth/login` — เข้าสู่ระบบ
- `POST /api/auth/refresh` — ขอ accessToken ใหม่
- `POST /api/auth/logout` — ออกจากระบบ

### Projects
- `GET /api/projects/stats/kpis` — KPI stats
- `GET /api/projects/stats/permit-summary` — สรุปสถานะใบอนุญาต
- `GET /api/projects` — รายชื่อโครงการ (pagination + filter)
- `GET /api/projects/:id` — รายละเอียดโครงการ
- `POST /api/projects` — สร้างโครงการ
- `PUT /api/projects/:id` — อัปเดตโครงการ
- `DELETE /api/projects/:id` — ลบโครงการ

### Doc Review
- `GET /api/doc-review` — รายการโครงการ
- `GET /api/doc-review/pending-revisions` — เอกสารต้องแก้
- `GET /api/doc-review/ready-to-submit` — พร้อมส่งหน่วยงาน
- `GET /api/doc-review/open-issues` — ปัญหาเอกสาร
- `POST /api/doc-review/projects/:id/submit` — ยื่นหน่วยงาน

### Permit Tracking
- `GET /api/permit-tracking` — สรุปสถานะใบอนุญาตทุกโครงการ

### Reports
- `GET /api/reports/summary/status` — สรุปตามสถานะ
- `GET /api/reports/summary/timeline` — ประวัติความคืบหน้า (pagination + search)
- (ดูเพิ่มใน `backend/src/routes/reports.js`)

### Settings & Backup
- `GET/PUT /api/settings/company` — ข้อมูลบริษัท
- `POST /api/backup` — สำรองฐานข้อมูล
- `POST /api/backup/restore/:name` — กู้คืน

---

## ประวัติการอัปเดต

### v1.2.0 (2026-07-17)

#### ฟีเจอร์ใหม่
- **เอกสารต้องแก้** — รวม checklist ที่ status=customer_revision ทุกโครงการไว้หน้าเดียว
- **สรุปส่งหน่วยงานวันนี้** — checklist ที่ status=passed แต่ยังไม่ได้ยื่น
- **ปัญหาเอกสาร** — รวมปัญหาที่ status=open ทุก package
- **ตารางติดตามใบอนุญาต** — สรุปสถานะใบอนุญาตทุกโครงการ

#### แก้ไข
- **Progress Calculation** — แก้ไขเป็น step position (50%) + checkpoint completion (50%)
- **Rate Limit** — Dev mode ข้าม rate limiting ทั้งหมด
- **Auth Fix** — ตรวจสอบ token ก่อนเรียก API ป้องกัน 401 loop
- **Backend** — ใช้ nodemon auto-restart

### v1.1.1 (2026-07-14)
- เพิ่ม service_type field สำหรับ flexible project scope
- Service Types: document_only, document_erc, full, custom

### v1.1.0
- Performance optimization + database indexes
- Auto backup + pagination
- NetworkMap UI improvements

### v1.0.25
- Initial production release

---

## License

MIT License
