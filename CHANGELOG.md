# Changelog

## v1.0.24 (2026-06-23)
- Security: Hash refresh tokens (SHA-256) ก่อนเก็บลง database
- Security: ไม่ reset admin password ถ้า admin user มีอยู่แล้ว
- Security: ใช้ INIT_ADMIN_PASSWORD env var สำหรับสร้าง admin ครั้งแรก
- Security: Production mode บังคับให้ INIT_ADMIN_PASSWORD ไม่เท่ากับ 'admin'
- Stability: เพิ่ม WAL checkpoint ใน maintenance service (ป้องกัน WAL file ใหญ่เกินไป)
- Test: แก้ organizations.test.js ให้ตรงกับ API response format { data, pagination }

## v1.0.23 (2026-06-16)
- Performance Phase 1-3: ปรับปรุง API response time, เพิ่ม pagination, แก้ correlated subquery
- Security P1: เพิ่ม backend permission checks (tasks, documents, projects, accounting)
- Security P2-A: เพิ่ม frontend route guard สำหรับ /users, /accounting
- Security P2-C: AuthContext ใช้ role จาก decoded JWT, ลบ permission leak
- Database: เพิ่ม auto-reconnect, SQLITE_BUSY retry, slow query log
- Tasks: เพิ่ม start_date column + API + UI
- Calendar Phase 1: Year view โหลดทั้งปี, แก้ timezone/date-only
- ลบ dist2/ ออกจาก git history (1.8 GB)
- ลบ build output (node_modules, dist, dist2) จากเครื่อง

## v1.0.18 (2026-06-15)
- Performance Phase 1: ลด dropdown limit (5000→200) ใน 6 ไฟล์ frontend
- Performance Phase 2: เพิ่ม start_date/end_date filter ใน tasks API
- Performance Phase 3: แก้ reports correlated subquery + pagination
- Organization contacts: เพิ่ม table + API + page ใหม่
- Calendar: เพิ่ม Day/Week/Month/Year view modes
- Sidebar: เพิ่มเมนู "เจ้าหน้าที่หน่วยงาน", "ปฏิทินงาน"
- Sidebar: ซ่อนเมนู "สัญญา" และ "ใบเสนอราคา"
- Sidebar: สลับตำแหน่งเมนู "งานที่มอบหมาย" และ "ลูกค้า"
- Login fix: แก้ token expiry check เพื่อป้องกัน login flicker
- Database: เพิ่ม auto-reconnect + SQLITE_BUSY retry + slow query log
- NetworkMap: รองรับพิกัดจริง site_lat/site_lng

## v1.0.17 (2026-05-25)
- แก้ไข timezone bug: timestamps จาก SQLite แสดงเวลาผิด 7 ชั่วโมง
- เพิ่มตั้งค่าทั่วไป: ภาษา, ธีม, รูปแบบวันที่, เขตเวลา (มีผลทั้งระบบ)
- เพิ่มอัปโหลดโลโก้บริษัท + แสดงใน PDF reports
- แสดงโลโก้บริษัทบน Dashboard
- ย้ายประวัติเวอร์ชันไป CHANGELOG.md + API endpoint
- แสดงเวอร์ชันตอนเปิดโปรแกรม (Electron console)
- แก้ไขข้อมูลซ้ำในหมวดหมู่บัญชี (seed data duplication bug)
- แก้ไข dropdown หมวดหมู่บัญชีไม่กรองตามประเภท (รายรับ/รายจ่าย)
- เพิ่มรายงานสรุปงานตามผู้รับผิดชอบ (Tasks by Assignee)
- เพิ่มรายงานรายละเอียดงานทั้งหมด (Tasks Details)
- แก้ไขรายงานผลงานรายบุคคลแสดงข้อมูลไม่ครบ (กรองเฉพาะ active users)
- ปรับปรุงการส่งออก Excel/PDF: เพิ่ม sheet สรุปตามผู้รับผิดชอบ + รายละเอียดงาน
- แก้ไขลบงวดชำระไม่ได้เมื่อมีรายการบัญชีเชื่อม (เพิ่ม force delete)
- แก้ไขสรุปภาพรวมบัญชีไม่อัปเดตหลังลบ/เพิ่ม/แก้ไขข้อมูล
- แก้ไขสรุปบัญชีแสดงข้อมูลโครงการที่ถูกลบแล้ว (orphaned transactions)
- เพิ่มหน้าคู่มือ (/help) ในแอป

## v1.0.16 (2026-05-22)
- ปรับปรุงระบบอัปโหลด/ดาวน์โหลดเอกสาร
- เพิ่ม progress bar, ชื่อไฟล์, validation

## v1.0.15 (2026-05-21)
- เพิ่ม API Change Impact Rule

## v1.0.14 (2026-05-20)
- แก้ไข ProjectModal crash จาก customers API response format

## v1.0.13 (2026-05-20)
- ปรับปรุงระบบใบเสนอราคา + สัญญา

## v1.0.12 (2026-05-19)
- เพิ่มระบบบัญชี: รายรับ/รายจ่าย, งวดชำระ, กราฟ

## v1.0.11 (2026-05-19)
- แยกโฟลเดอร์เอกสารตามชื่อโครงการ + รหัส
- เก็บชื่อไฟล์เดิมบนดิสก์ (ไม่ใช้ UUID) + จัดการชื่อซ้ำ
- ดาวน์โหลดไฟล์ผ่าน native save dialog ใน Electron
- เพิ่มปุ่มเลือกโฟลเดอร์จัดเก็บในหน้าตั้งค่า
- กรองเอกสารตามโครงการ + การ์ดสรุปตามโครงการ
- สร้างรหัสโครงการอัตโนมัติ (P6905-001)

## v1.0.10 (2026-05-19)
- แก้ไข QA/QC ระบบอัปโหลดเอกสาร
- แก้ชื่อไฟล์ว่างสำหรับ dotfiles
- จำกัดความยาวชื่อไฟล์/โฟลเดอร์/เอกสาร

## v1.0.9 (2026-05-18)
- ลบ test comment
- อัปเดตเอกสาร CLAUDE.md

## v1.0.8 (2026-05-17)
- ทดสอบ CI/CD auto-version workflow
- ใช้ npm version patch แทน manual parsing

## v1.0.7 (2026-05-16)
- อัปเดต rule สำหรับ CI/CD auto-release
- เพิ่ม auto-version + auto-release workflow

## v1.0.6 (2026-05-15)
- แก้ไขยอดรวมงวดชำระไม่ครบ เพิ่ม installments_total_paid

## v1.0.5 (2026-05-16)
- เพิ่มเมนู "ใบเสนอราคา" ใน Sidebar
- เปิด SQLite WAL mode + performance PRAGMAs
- แก้ schema mismatch: เพิ่ม 10 columns ที่หายไป
- เพิ่ม transaction support (BEGIN/COMMIT/ROLLBACK)
- แก้ดาวน์โหลดเอกสารไม่ได้
- เพิ่มปุ่มส่งออกข้อมูลบัญชีเป็น CSV
- เพิ่มตั้งค่าที่จัดเก็บไฟล์เอกสาร

## v1.0.4 (2026-05-15)
- แก้ไขระบบหน่วยงาน: เพิ่มปุ่มอนุมัติ/ปฏิเสธ
- เพิ่ม notification เมื่ออนุมัติ/ปฏิเสธหน่วยงาน
- validate ประเภทหน่วยงาน (org_type) ที่ backend

## v1.0.3 (2026-05-15)
- เพิ่ม composite indexes สำหรับ report queries
- เพิ่ม auto-vacuum + auto-cleanup logs

## v1.0.2 (2026-05-14)
- แก้ bug migration ไม่ทำงานตอนอัปเดตแอพ

## v1.0.1 (2026-05-14)
- เพิ่มระบบอัปเดตอัตโนมัติ (electron-updater)
- เพิ่ม GitHub Actions สำหรับ build & release
- แสดงเวอร์ชันปัจจุบันที่ Sidebar
- เพิ่มประวัติเวอร์ชันในหน้าตั้งค่า

## v1.0.0 (2026-05-14)
- เปิดตัว Solar Dashboard Desktop App
- ระบบติดตามโครงการ Solar ครบวงจร
- รองรับ 4 บทบาท: Admin, Engineer, Staff, Client
- ขั้นตอนดำเนินงาน 7 ขั้น: Survey → COD
- แผนที่เครือข่าย, รายงาน, สัญญา, บัญชี
