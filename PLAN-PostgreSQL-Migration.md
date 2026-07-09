# แผนงาน: ย้าย Solar Dashboard ไปใช้ PostgreSQL

**สถานะ:** รอดำเนินการ  
**เป้าหมาย:** ใช้คอมของผู้พัฒนาเป็น server สำหรับองค์กร  
**เป้าหมายผู้ใช้:** 5-15 คนใน network เดียวกัน

---

## Phase 0: ติดตั้ง PostgreSQL (ประมาณ 30 นาที)

### 0.1 ดาวน์โหลดและติดตั้ง
- [ ] ดาวน์โหลด PostgreSQL 16+ จาก https://www.postgresql.org/download/windows/
- [ ] เลือก port: **5432** (default)
- [ ] ตั้ง password สำหรับ postgres superuser (จดเก็บไว้)
- [ ] ติดตั้ง pgAdmin (เลือกตอน install)

### 0.2 สร้าง Database
```sql
-- เปิด pgAdmin หรือ SQL Shell
CREATE DATABASE solar_dashboard;
CREATE USER solar_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE solar_dashboard TO solar_user;
ALTER DATABASE solar_dashboard OWNER TO solar_user;
```

### 0.3 ทดสอบการเชื่อมต่อ
```bash
psql -h localhost -U solar_user -d solar_dashboard
```

---

## Phase 1: แก้ Backend ให้เชื่อม PostgreSQL (ประมาณ 2-3 ชั่วโมง)

### 1.1 ติดตั้ง dependencies
```bash
cd backend
npm install pg
```

### 1.2 แก้ไฟล์ database.js
- [ ] เปลี่ยนจาก `sqlite3` เป็น `pg` (PostgreSQL client)
- [ ] ตั้งค่า connection string:
  ```
  postgresql://solar_user:password@localhost:5432/solar_dashboard
  ```
- [ ] ใช้ connection pool (max: 20 connections)
- [ ] 保持 API interface เดิม (`pool.query()`) ให้ route files ไม่ต้องแก้

### 1.3 แก้ Migration Files (001-010)
- [ ] เปลี่ยน SQL syntax จาก SQLite → PostgreSQL:
  - `TEXT` → `TEXT` / `VARCHAR`
  - `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMP DEFAULT NOW()`
  - `AUTOINCREMENT` → `SERIAL` / `GENERATED ALWAYS AS IDENTITY`
  - `IF NOT EXISTS` → ใช้ได้เหมือนเดิม
  - `pragma_table_info()` → `information_schema.columns`
- [ ] ทดสอบ migration บน PostgreSQL จริง

### 1.4 แก้ Route Files ที่ใช้ SQLite-specific syntax
- [ ] ค้นหา `sqlite3` / `sqlite` ทุกที่ใน backend
- [ ] แก้ `datetime('now')` → `NOW()`
- [ ] แก้ `GROUP_CONCAT` → `STRING_AGG`
- [ ] แก้ `IFNULL` → `COALESCE`
- [ ] แก้ `GLOB` → `LIKE` / `~` (regex)
- [ ] ทดสอบ API ทุก endpoint

### 1.5 แก้ Init-DB Script
- [ ] แก้ `init-db.cjs` ให้สร้าง tables บน PostgreSQL
- [ ] Seed data (admin user, default roles)

---

## Phase 2: ตั้งค่า Network (ประมาณ 30 นาที)

### 2.1 เปิด Firewall
```powershell
# Run PowerShell as Admin
netsh advfirewall firewall add rule name="Solar Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

### 2.2 หา IP ของเครื่อง
```powershell
ipconfig
# จด IPv4 Address เช่น 192.168.1.100
```

### 2.3 ทดสอบจากเครื่องอื่น
- [ ] เปิด browser บนเครื่องอื่น
- [ ] เข้า `http://192.168.1.100:3000`
- [ ] Login ด้วย admin/admin

---

## Phase 3: Auto-start + Backup (ประมาณ 1 ชั่วโมง)

### 3.1 ทำให้ app เริ่มต้นอัตโนมัติ
- [ ] สร้าง Task Scheduler:
  - Trigger: At log on
  - Action: เริ่ม Solar Dashboard.exe
- [ ] ตั้งให้ PostgreSQL service เริ่มอัตโนมัติ:
  ```
  Services → postgresql-x64-16 → Startup type: Automatic
  ```

### 3.2 Backup อัตโนมัติ
- [ ] สร้าง backup script (`backup-postgres.bat`):
  ```bat
  pg_dump -h localhost -U solar_user -d solar_dashboard > backup_%date:~-4%%date:~4,2%%date:~7,2%.sql
  ```
- [ ] Task Scheduler: ทุกวัน 23:00
- [ ] เก็บ backup 最少 7 วัน

### 3.3 Restore Script
- [ ] สร้าง restore script สำหรับกรณีฉุกเฉิน

---

## Phase 4: ปรับปรุง Performance (ทำหลังใช้งานจริง)

### 4.1 Database Optimization
- [ ] เพิ่ม indexes สำหรับ query ที่ช้า
- [ ] ตั้ง connection pooling (pgBouncer ถ้าจำเป็น)
- [ ] ตั้ง shared_buffers = 256MB, work_mem = 16MB

### 4.2 Monitoring
- [ ] ติดตั้ง pg_stat_statements สำหรับดู slow queries
- [ ] ตั้ง log rotation

---

## แผนผังระบบสุดท้าย

```
┌──────────────────────────────────────────┐
│          คอมผู้พัฒนา (Server)             │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL   │  │ Node.js Backend │   │
│  │ port 5432    │←→│ port 5000       │   │
│  │              │  │ (Express)       │   │
│  │ solar_dashboard│ └────────┬────────┘   │
│  └──────────────┘           │            │
└─────────────────────────────┼────────────┘
                              │ LAN
            ┌─────────────────┼─────────────────┐
            │                 │                 │
         User 1           User 2           User 3
      (browser)         (browser)         (browser)
   http://192.168.x.x:3000
```

---

## ประมาณการเวลา

| Phase | งาน | เวลาประมาณ |
|-------|-----|-----------|
| Phase 0 | ติดตั้ง PostgreSQL | 30 นาที |
| Phase 1 | แก้ Backend | 2-3 ชั่วโมง |
| Phase 2 | Network Setup | 30 นาที |
| Phase 3 | Auto-start + Backup | 1 ชั่วโมง |
| Phase 4 | Performance | ทำหลัง |
| **รวม** | | **ประมาณ 4-5 ชั่วโมง** |

---

## ข้อควรระวัง

1. **Backup DB เดิมก่อนย้าย** — คัดลอก `solar_dashboard.db` เก็บไว้
2. **ทดสอบบน dev ก่อน deploy** — อย่าแก้ production ตรงๆ
3. **Password ต้องปลอดภัย** — อย่า hardcode ในโค้ด ใช้ `.env`
4. **PostgreSQL password จดไว้** — ถ้าลืม reset ยาก
5. **Firewall ป้องกันจาก internet** — เปิดแค่ port 5000 + 5432 ใน LAN เท่านั้น
