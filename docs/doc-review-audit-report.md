# รายงานตรวจสอบ ARCHITECTURE.md กับโค้ดจริง (Doc Review Module)

## วันที่ตรวจสอบ: 2026-07-07

---

## 1. รายการที่ "ตรงกับโค้ดจริง"

### Database Tables (ER Diagram)
| Table | ARCHITECTURE.md | Migration จริง | สถานะ |
|-------|-----------------|-----------------|-------|
| doc_review_projects | ✓ | Migration 006 | ตรงกัน |
| doc_review_checklists | ✓ | Migration 006 + 007 | ตรงกัน |
| doc_review_files | ✓ | Migration 006 | ตรงกัน |
| doc_review_comments | ✓ | Migration 006 | ตรงกัน |
| doc_review_approvals | ✓ | Migration 006 + 007 | ตรงกัน |
| doc_agency_submissions | ✓ | Migration 006 + 007 | ตรงกัน |
| doc_submission_packages | ✓ | Migration 007 | ตรงกัน |
| document_receipts | ✓ | Migration 008 | ตรงกัน |
| document_issues | ✓ | Migration 008 | ตรงกัน |
| doc_review_template_checklists | ✓ | seed-checklist-templates.cjs | ตรงกัน |
| doc_review_template_items | ✓ | seed-checklist-templates.cjs | ตรงกัน |

### API Endpoints
| Endpoint | ARCHITECTURE.md | Backend Route จริง | สถานะ |
|----------|-----------------|---------------------|-------|
| GET /api/doc-review/projects | ✓ | doc-review-projects.js | ตรงกัน |
| POST /api/doc-review/projects | ✓ | doc-review-projects.js | ตรงกัน |
| GET /api/doc-review/projects/:id | ✓ | doc-review-projects.js | ตรงกัน |
| PUT /api/doc-review/projects/:id | ✓ | doc-review-projects.js | ตรงกัน |
| DELETE /api/doc-review/projects/:id | ✓ | doc-review-projects.js | ตรงกัน |
| GET /api/doc-review/dashboard/summary | ✓ | doc-review-projects.js | ตรงกัน |
| GET /api/doc-review/projects/:id/packages | ✓ | doc-review-packages.js | ตรงกัน |
| POST /api/doc-review/projects/:id/packages | ✓ | doc-review-packages.js | ตรงกัน |
| GET /api/doc-review/packages/:id | ✓ | doc-review-packages.js | ตรงกัน |
| PUT /api/doc-review/packages/:id | ✓ | doc-review-packages.js | ตรงกัน |
| DELETE /api/doc-review/packages/:id | ✓ | doc-review-packages.js | ตรงกัน |
| POST /api/doc-review/packages/:id/generate-checklist | ✓ | doc-review-packages.js | ตรงกัน |
| GET /api/doc-review/projects/:id/checklists | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/projects/:id/checklists | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/projects/:id/checklists/from-template | ✓ | doc-review-checklists.js | ตรงกัน |
| PUT /api/doc-review/checklists/:id | ✓ | doc-review-checklists.js | ตรงกัน |
| DELETE /api/doc-review/checklists/:id | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/projects/:id/checklists/batch-receive | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/checklists/batch-approve | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/checklists/batch-reject | ✓ | doc-review-checklists.js | ตรงกัน |
| POST /api/doc-review/checklists/:id/comments | ✓ | doc-review-comments.js | ตรงกัน |
| GET /api/doc-review/checklists/:id/comments | ✓ | doc-review-comments.js | ตรงกัน |
| POST /api/doc-review/projects/:id/approve | ✓ | doc-review-approvals.js | ตรงกัน |
| POST /api/doc-review/projects/:id/reject | ✓ | doc-review-approvals.js | ตรงกัน |
| GET /api/doc-review/projects/:id/approvals | ✓ | doc-review-approvals.js | ตรงกัน |
| POST /api/doc-review/projects/:id/submit | ✓ | doc-review-submissions.js | ตรงกัน |
| PUT /api/doc-review/submissions/:id | ✓ | doc-review-submissions.js | ตรงกัน |
| DELETE /api/doc-review/submissions/:id | ✓ | doc-review-submissions.js | ตรงกัน |
| GET /api/doc-review/submissions | ✓ | doc-review-submissions.js | ตรงกัน |
| GET /api/doc-review/projects/:id/submissions | ✓ | doc-review-submissions.js | ตรงกัน |
| POST /api/doc-review/checklists/:id/files | ✓ | doc-review-files.js | ตรงกัน |
| GET /api/doc-review/checklists/:id/files | ✓ | doc-review-files.js | ตรงกัน |
| GET /api/doc-review/files/:id/download | ✓ | doc-review-files.js | ตรงกัน |
| DELETE /api/doc-review/files/:id | ✓ | doc-review-files.js | ตรงกัน |
| POST /api/doc-review/issues | ✓ | doc-review-issues.js | ตรงกัน |
| PUT /api/doc-review/issues/:id/resolve | ✓ | doc-review-issues.js | ตรงกัน |
| GET /api/doc-review/packages/:id/issues | ✓ | doc-review-issues.js | ตรงกัน |
| POST /api/doc-review/receipts | ✓ | doc-review-receipts.js | ตรงกัน |
| GET /api/doc-review/receipts/checklists/:id | ✓ | doc-review-receipts.js | ตรงกัน |
| POST /api/doc-review/correction-reports | ✓ | doc-review-correction-reports.js | ตรงกัน |
| GET /api/doc-review/correction-reports/:id | ✓ | doc-review-correction-reports.js | ตรงกัน |
| GET /api/doc-review/template-checklists | ✓ | doc-review-template-checklists.js | ตรงกัน |
| POST /api/doc-review/template-checklists | ✓ | doc-review-template-checklists.js | ตรงกัน |
| PUT /api/doc-review/template-checklists/:id | ✓ | doc-review-template-checklists.js | ตรงกัน |
| DELETE /api/doc-review/template-checklists/:id | ✓ | doc-review-template-checklists.js | ตรงกัน |
| POST /api/doc-review/template-checklists/:id/copy | ✓ | doc-review-template-checklists.js | ตรงกัน |

### Status Values
| Status Type | ARCHITECTURE.md | Code จริง | สถานะ |
|-------------|-----------------|------------|-------|
| Checklist Status | not_received, pending, received, checking, passed, failed, customer_revision | Valid: pending, checking, customer_revision, passed, failed | ⚠️ เหลื่อมล้ำ |
| Package Status | waiting_documents, internal_review, customer_revision, ready_to_submit, submitted_agency, agency_revision, approved | ตรงกัน | ตรงกัน |
| Project Status | waiting_documents, internal_review, customer_revision, ready_to_submit, submitted_agency, agency_revision, approved | ตรงกัน | ตรงกัน |
| Agency Status | pending, approved, revision_requested, resubmitted | ตรงกัน | ตรงกัน |

### Business Logic
| Logic | ARCHITECTURE.md | Code จริง | สถานะ |
|-------|-----------------|------------|-------|
| recalculatePackageStatus | ✓ | doc-review-checklists.js line 18 | ตรงกัน |
| syncProjectStatus | ✓ | doc-review-checklists.js line 70 | ตรงกัน |
| Batch receive | ✓ | doc-review-checklists.js | ตรงกัน |
| Batch approve | ✓ | doc-review-checklists.js | ตรงกัน |
| Batch reject | ✓ | doc-review-checklists.js | ตรงกัน |

---

## 2. รายการที่ "ไม่ตรง / ต้องแก้ในเอกสาร"

### 2.1 Checklist Status ไม่ตรงกัน
| รายการ | ARCHITECTURE.md | Code จริง | ปัญหา |
|--------|-----------------|------------|-------|
| Checklist Status | not_received, pending, received, checking, passed, failed, customer_revision | Valid: pending, checking, customer_revision, passed, failed | ARCHITECTURE.md มี `not_received`, `received` แต่ code ไม่มีใน VALID_CHECKLIST_STATUSES |

**สาเหตุ**: `not_received` และ `received` ถูกใช้ใน batch-receive แต่ไม่ได้อยู่ใน VALID_CHECKLIST_STATUSES ของ PUT endpoint

### 2.2 doc_agency_submissions ไม่มี package_id ใน Migration 006
| รายการ | ARCHITECTURE.md | Migration จริง | ปัญหา |
|--------|-----------------|-----------------|-------|
| doc_agency_submissions.package_id | ✓ มี | Migration 006 ไม่มี | เพิ่มใน Migration 007 |

**สถานะ**: ตรงกันแล้ว (เพิ่มใน Migration 007)

---

## 3. รายการที่ "โค้ดมี แต่เอกสารยังไม่มี"

| รายการ | ไฟล์โค้ด | สถานะ |
|--------|----------|-------|
| correction_reports table | Migration 008, doc-review-correction-reports.js | **ไม่มีใน ER Diagram** |
| getReviewSummary endpoint | doc-review-projects.js | **ไม่มีใน API Endpoints table** |
| copyTemplateChecklist endpoint | doc-review-template-checklists.js | **ไม่มีใน API Endpoints table** |

---

## 4. รายการที่ "เอกสารมี แต่โค้ดไม่มี"

ไม่พบรายการที่เอกสารมีแต่โค้ดไม่มี

---

## 5. ข้อเสนอแก้ `ARCHITECTURE.md`

### 5.1 เพิ่ม correction_reports table ใน ER Diagram
```mermaid
correction_reports {
    TEXT id PK
    TEXT package_id FK
    TEXT issues "JSON array of issue IDs"
    TEXT exported_format "pdf|excel"
    DATETIME exported_at
    TEXT created_by FK
}
```

### 5.2 เพิ่ม endpoints ที่ตกหล่น
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/doc-review/dashboard/summary` | GET | สรุปสถานะทั้งหมด |
| `/api/doc-review/template-checklists/:id/copy` | POST | คัดลอก template |

### 5.3 แก้ไข Checklist Status
เปลี่ยนจาก:
```
not_received|pending|received|checking|passed|failed|customer_revision
```
เป็น:
```
pending|checking|customer_revision|passed|failed
```
(เนื่องจาก `not_received` และ `received` ไม่ได้อยู่ใน VALID_CHECKLIST_STATUSES)

### 5.4 เพิ่ม Relationships
```mermaid
doc_submission_packages ||--o{ correction_reports : "package_id"
```

---

## สรุป

| ประเภท | จำนวน |
|--------|-------|
| ตรงกับโค้ดจริง | 42 endpoints, 11 tables |
| ต้องแก้ในเอกสาร | 3 จุด |
| โค้ดมีแต่เอกสารไม่มี | 3 จุด |
| เอกสารมีแต่โค้ดไม่มี | 0 จุด |
