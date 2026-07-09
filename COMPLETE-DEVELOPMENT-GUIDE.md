# Solar Dashboard — Complete Development Guide

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09  
**รวมทั้งหมด:** 12 หัวข้อ

---

## Table of Contents

1. [Software Engineering](#1-software-engineering)
2. [Backend Design](#2-backend-design)
3. [API Design](#3-api-design)
4. [Database Design](#4-database-design)
5. [Frontend Design](#5-frontend-design)
6. [UI/UX Design](#6-uiux-design)
7. [Mobile App Design](#7-mobile-app-design)
8. [Docker & Container](#8-docker--container)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [OWASP Security](#10-owasp-security)
11. [Git Flow](#11-git-flow)
12. [Solar Dashboard Context](#12-solar-dashboard-context)

---

# 1. Software Engineering

## หลักการทำงาน
* วิเคราะห์ Requirement ให้ครบถ้วนก่อนเริ่มเขียนโค้ด
* ห้ามเดา Requirement — ถ้าไม่ชัดเจนให้สอบถาม
* ออกแบบโครงสร้างก่อนลงมือเขียนโค้ด
* คิดถึง Scalability / Maintainability / Performance / Security / Data Integrity / Concurrency
* ลด Technical Debt ให้มากที่สุด

## มาตรฐานโค้ด
* อ่านง่าย, ชื่อ Function/Variable สื่อความหมาย
* ห้าม Magic Number, ห้ามโค้ดซ้ำ (DRY)
* ใช้ SOLID / KISS / YAGNI / Separation of Concerns
* Modular Design / Clean Architecture / Clean Code
* Error Handling ครบทุกกรณี, Logging ที่จำเป็น
* Validation ทุก Input / Sanitize Input / Escape Output

## Backend Layers
```
Presentation → Controller → Service → Repository → Database
```
Business Logic ต้องอยู่ใน Service เท่านั้น

## Documentation
ทุก Function ต้องมี Comment ภาษาไทย (หน้าที่ / Input / Output / ข้อควรระวัง)

## การแก้ไขโค้ด
**ก่อนแก้ไข:** วิเคราะห์ปัญหา → สาเหตุ → ผลกระทบ → แนวทางแก้ไข → ความเสี่ยง → วิธีทดสอบ  
**หลังแก้ไข:** ไฟล์ที่แก้ → จำนวนบรรทัด → สิ่งที่เปลี่ยน/ไม่เปลี่ยน → Backward Compatibility

## ข้อห้าม
* ห้ามแก้ไขไฟล์ที่ไม่เกี่ยวข้อง
* ห้ามเปลี่ยน API เดิมจนทำให้ระบบอื่นเสีย
* ห้าม Refactor ทั้งระบบ โดยไม่ได้รับอนุญาต
* ห้ามทำให้ระบบเดิมใช้งานไม่ได้ (Backward Compatibility)

---

# 2. Backend Design

## Architecture Patterns
- **Layered Architecture** — Presentation → Controller → Service → Repository → Database
- **MVC** — Model-View-Controller สำหรับ web app
- **Event-driven** — async processing

## Middleware Pipeline
```
Request → Rate Limiter → CORS → Auth → Validation → Controller → Response
                                                           ↓
                                                     Error Handler
```

## Authentication
- JWT Flow: Login → accessToken (15min) + refreshToken (30 days) → Token Rotation
- RBAC: Admin / Engineer / Staff / Client

## Error Handling
```
400 Bad Request       → Validation fail
401 Unauthorized      → No token
403 Forbidden         → No permission
404 Not Found         → Resource not found
409 Conflict          → Duplicate data
429 Too Many Requests → Rate limit
500 Internal Error    → Unexpected error
```

## Rate Limiting
- General: 200 requests/min
- Login: 20 attempts/15min
- Upload: 50/hour

## File Upload Security
- Validate type + size (50MB max)
- UUID filename (ป้องกัน path traversal)
- Allowed types: pdf, doc, docx, xls, xlsx, jpg, png, zip

## Caching Strategy
Cache-Aside: Check cache → Hit = return / Miss = query DB → store → return

## Health Check
```javascript
GET /api/health → { status, database, uptime, timestamp, version }
```

## Logging
```
ERROR   → ข้อผิดพลาดที่ต้องแก้
WARN    → สิ่งที่น่าสงสัย
INFO    → การทำงานปกติ
DEBUG   → ข้อมูลละเอียดสำหรับ debug
```

---

# 3. API Design

## RESTful Principles
- Nouns ใน URL (`/users` ไม่ใช `/getUsers`)
- HTTP Methods: GET=อ่าน, POST=สร้าง, PUT=อัปเดตทั้งก้อน, PATCH=บางส่วน, DELETE=ลบ
- Stateless

## URL Structure
```
GET    /api/resources           → รายการทั้งหมด
GET    /api/resources/:id       → รายการเดียว
POST   /api/resources           → สร้างใหม่
PUT    /api/resources/:id       → อัปเดตทั้งก้อน
PATCH  /api/resources/:id       → อัปเดตบาง field
DELETE /api/resources/:id       → ลบ
```

## Response Structure
```json
// Success
{ "status": "success", "data": {}, "meta": { "page": 1, "total": 150 } }
// Error
{ "status": "error", "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## Pagination
- Offset: `?page=2&per_page=20`
- Cursor: `?cursor=abc123&limit=20`

## Filtering / Sorting / Searching
```
GET /api/projects?status=active&sort=-created_at&search=keyword
```

---

# 4. Database Design

## Normalization
- **1NF** — atomic values
- **2NF** — full dependency on PK
- **3NF** — no transitive dependency

## Schema Design
- Table: `snake_case` พหูพจน์ (เช่น `users`, `doc_review_projects`)
- ทุก table ต้องมี `id`, `created_at`, `updated_at`

## Primary Key
- UUID (TEXT) สำหรับ distributed systems
- INTEGER AUTOINCREMENT สำหรับ single-server

## Foreign Key
- ทุก FK ต้องมี `ON DELETE` action: CASCADE / SET NULL / RESTRICT

## Migration Strategy
- ทุก migration ต้องมี `up()` / `down()`
- ใช้ `IF NOT EXISTS` สำหรับ CREATE TABLE/INDEX
- ทดสอบ migration บน backup DB ก่อน deploy

## Query Optimization
```
❌ N+1:  query project → loop → query checklists for each
✅ JOIN: SELECT p.*, COUNT(c.id) FROM projects p LEFT JOIN checklists c ON ...
```

---

# 5. Frontend Design

## Component Design
- Single Responsibility — แต่ละ component ทำหน้าที่เดียว
- Reusable / Composable / Configurable

## Component States
Default / Hover / Active / Focus / Disabled / Loading / Error / Empty

## State Management
- Local State: UI state, Form data
- Global State (Context): Auth, Theme, Notifications
- Server State: API data, Cache

## Responsive Breakpoints
```
Mobile:  < 640px   | Tablet: 640-1024px | Desktop: > 1024px
```

## Performance
- React.memo / useMemo / useCallback
- Code Splitting (React.lazy)
- Lazy load images

## Accessibility
- Keyboard navigation + ARIA labels
- Focus indicator + Color contrast >= 4.5:1

---

# 6. UI/UX Design

## UX Principles
1. Visibility of System Status — loading/progress เสมอ
2. Match System ↔ Real World — ภาษาที่ผู้ใช้คุ้นเคย
3. User Control — Undo/Cancel เสมอ
4. Consistency — component เดียวกัน = behavior เดียวกัน
5. Error Prevention — validate input ขณะพิมพ์
6. Recognition > Recall — auto-complete, recent items
7. Minimalist — แสดงเฉพาะข้อมูลจำเป็น

## Color System
```
Primary:   blue-600  | Success: emerald-500
Warning:   amber-500 | Error: red-500
```

## Spacing (8px Grid)
4px → 8px → 16px → 24px → 32px → 48px

## Design Tokens
```css
--radius-sm: 8px  | --radius-md: 12px | --radius-lg: 16px
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)
```

---

# 7. Mobile App Design

## Platform Guidelines
- **iOS**: San Francisco font, Tab bar ด้านล่าง, Pull-to-refresh
- **Android**: Roboto font, Bottom navigation, FAB, Ripple effect

## Thumb Zone
```
Hard (ซ้ายบน) → OK (กลาง) → Easy (ล่างกลาง) ← ปุ่มหลัก
```

## Navigation Rules
| Pattern | ใช้เมื่อ |
|---------|---------|
| Bottom Tab | 3-5 main sections |
| Stack Nav | Drill-down content |
| Modal/Sheet | Quick action, form สั้น |
| FAB | Action หลักของหน้า |

## Touch Targets
- Minimum: 44x44px (iOS) / 48x48dp (Android)

## Offline Support
- Cache-first / Network-first / Offline-first
- Queue actions → sync เมื่อ online

---

# 8. Docker & Container

## Dockerfile Best Practices
- Multi-stage build สำหรับลด image size
- Alpine base image
- Layer ordering: static →变动น้อย
- Non-root user
- .dockerignore

## Multi-Stage Build
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "src/index.js"]
```

## Docker Compose (Production)
```yaml
services:
  backend:
    image: ghcr.io/owner/solar-backend:latest
    ports: ["5000:5000"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5000/api/health"]
      interval: 30s
  frontend:
    image: ghcr.io/owner/solar-frontend:latest
    ports: ["80:3000"]
```

## Security
- ห้ามใช้ latest tag ใน production
- ห้ามเก็บ secrets ใน image
- Non-root user + resource limits

## Commands
```bash
docker compose up -d --build
docker compose down
docker compose logs -f
docker system prune -a
```

---

# 9. CI/CD Pipeline

## CI Pipeline (GitHub Actions)
```
Push/PR → Lint → Backend Test → Frontend Build → Security Scan
```

## CD Pipeline (Tag Push)
```
Tag v* → Build Docker → Push GHCR → Deploy Production → Health Check
```

## Branch Strategy Mapping
| Branch | CI | CD |
|--------|----|----|
| feature/* | Lint + Test | - |
| develop | Lint + Test + Build | Deploy Staging |
| main | Full pipeline | Deploy Production |
| hotfix/* | Full pipeline | Deploy Production (fast-track) |

## Deployment Strategies
- **Rolling Update** — zero downtime, gradual
- **Blue-Green** — instant rollback, ใช้ทรัพยากร 2 เท่า
- **Canary** — gradual rollout, detect issues early

## Metrics
- Build Time < 5 min | Test Time < 10 min
- Deploy Frequency >= 1/week | MTTR < 30 min

---

# 10. OWASP Security

## OWASP Top 10 (2021)

| # | ภัยคุกคาม | การป้องกัน |
|---|-----------|-----------|
| A01 | Broken Access Control | ตรวจสอบสิทธิ์ทุก request, enforce ownership |
| A02 | Cryptographic Failures | HTTPS, bcrypt >= 12 rounds |
| A03 | Injection | Parameterized query, escape output |
| A04 | Insecure Design | Threat modeling, secure design |
| A05 | Security Misconfiguration | ปิด debug mode, minimal privilege |
| A06 | Vulnerable Components | npm audit, อัปเดต dependencies |
| A07 | Auth Failures | Rate limit login, MFA, session timeout |
| A08 | Data Integrity | ตรวจสอบ integrity, signed updates |
| A09 | Logging Failures | Log security events, monitor |
| A10 | SSRF | Validate URL, whitelist domains |

## Security Checklist
- [ ] Authorization ทุก API endpoint
- [ ] HTTPS ทั้ง production
- [ ] Password hash bcrypt >= 12 rounds
- [ ] JWT secret ใน .env เท่านั้น
- [ ] Parameterized query ทุก query
- [ ] Rate limiting login: 20 attempts/15min
- [ ] Helmet.js + CORS configured
- [ ] npm audit ทุก sprint
- [ ] Log security events

---

# 11. Git Flow

## Branch Structure
```
main (production) ← release เท่านั้น
  ├── release/v1.1.0
  │     ├── feature/dynamic-agencies
  │     └── fix/timeline-not-showing
  └── develop (integration)
        ├── feature/template-redesign
        └── fix/template-save-error
```

## Branch Rules
| Branch | สร้างจาก | Merge ไป | ใช้ทำอะไร |
|--------|----------|----------|----------|
| main | - | - | Production code |
| develop | main | main (ผ่าน release) | Integration |
| feature/* | develop | develop | ฟีเจอร์ใหม่ |
| fix/* | develop | develop | แก้บัค |
| release/* | develop | main + develop | Pre-release test |
| hotfix/* | main | main + develop | แก้ด่วน production |

## Conventional Commits
```
feat:     เพิ่มฟีเจอร์ใหม่
fix:      แก้ไขบัค
docs:     แก้ไขเอกสาร
refactor: ปรับโครงสร้างโค้ด
test:     เพิ่ม/แก้ไข test
chore:    ปรับปรุง build/CI
perf:     ปรับปรุง performance
```

## PR Rules
1. Branch naming: `feature/`, `fix/`, `release/`, `hotfix/`
2. Commit message: Conventional Commits
3. Code review: ต้องมีคนอื่น review ก่อน merge
4. CI must pass
5. No force push บน main / develop
6. Squash merge สำหรับ feature branches

---

# 12. Solar Dashboard Context

## ข้อมูลโปรเจกต์
- **ชื่อ:** Solar Dashboard — ระบบจัดการเอกสารสำหรับ solar panel installation
- **Stack:** Node.js/Express + SQLite + React + Tailwind CSS + Electron
- **Port:** Backend 5000, Frontend 3000
- **DB:** SQLite (solar_dashboard.db)

## Modules
Dashboard + Projects + Tasks + Calendar + Documents + Checkpoints
Doc Review (Checklists, Packages, Templates) + Agency Tracking + Timeline
Reports (10 types) + Accounting + Contracts + Quotations + Customer Portal + Network Map

## Status Flow
```
Package: waiting_documents → ready_to_submit → submitted_agency → approved
Checklist: pending → received → checking → passed / failed / customer_revision
```

## Key APIs
- `GET /api/doc-review/template-checklists/agencies` — รายชื่อหน่วยงาน
- `GET /api/doc-review/template-checklists/permit-types` — ประเภทใบอนุญาต
- `GET /api/doc-review/checklists/:id/timeline` — Timeline
- `GET /api/doc-review/submissions` — Agency Tracking (round ล่าสุด)
- `GET /api/doc-review/submissions/history` — ประวัติย้อนหลัง

## Rules
- แก้เฉพาะจุด ห้ามสร้างเพิ่ม ห้ามแก้โครงสร้างอื่น
- Backend server ต้อง restart หลังแก้ route
- DB migration ต้อง backward compatible
- ห้ามทดสอบบนโปรแกรมจริงที่ติดตั้งแล้ว — ทดสอบเฉพาะ dev mode

## DB Compatibility
- v1.1.0 backward compatible กับ v1.0.25
- Migration runner: db.exec() สำหรับ multi-statement SQL
- Migration 007: ALTER TABLE with try-catch
- ทดสอบแล้ว: backup v1.0.25 (26 tables) → v1.1.0 (44 tables)

---

**Source files:**  
SOFTWARE-ENGINEERING-PROMPT.md, BACKEND-DESIGN-PROMPT.md, API-DESIGN-PROMPT.md,  
DATABASE-DESIGN-PROMPT.md, FRONTEND-DESIGN-PROMPT.md, UIUX-DESIGN-PROMPT.md,  
MOBILE-APP-DESIGN-PROMPT.md, DOCKER-DESIGN-PROMPT.md, CI-CD-DESIGN-PROMPT.md,  
OWASP-SECURITY.md, GIT-FLOW.md, UX-UI-GUIDELINES.md
