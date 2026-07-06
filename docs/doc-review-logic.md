# Doc Review & Agency Submission - Logic Document

## ภาพรวมระบบ

ระบบตรวจเอกสารและยื่นหน่วยงานสำหรับโครงการ Solar Rooftop/Plant จัดการตั้งแต่รับเอกสารจากลูกค้า ตรวจเอกสารภายใน อนุมัติ ยื่นหน่วยงาน จนถึงอนุมัติ

---

## 1. Workflow / Pipeline

```
รับเอกสาร → บันทึกเข้าระบบ → ตรวจเอกสาร → ตรวจสอบผล → ยื่นหน่วยงาน → ติดตามผล → อนุมัติ/ปิดงาน
```

### สถานะโครงการ (doc_review_projects.project_status)

| Status | Label | คำอธิบาย |
|--------|-------|----------|
| `waiting_documents` | รอเอกสาร | ยังไม่ได้รับเอกสารครบ |
| `internal_review` | กำลังตรวจ | อยู่ระหว่างตรวจเอกสารภายใน |
| `customer_revision` | รอลูกค้าแก้ | ส่งเอกสารกลับให้ลูกค้าแก้ไข |
| `ready_to_submit` | พร้อมยื่น | อนุมัติภายในแล้ว พร้อมยื่นหน่วยงาน |
| `submitted_agency` | ยื่นแล้ว | ยื่นเอกสารให้หน่วยงานแล้ว |
| `agency_revision` | หน่วยงานให้แก้ | หน่วยงานส่งกลับให้แก้ไข |
| `approved` | อนุมัติแล้ว | หน่วยงานอนุมัติแล้ว |

### สถานะชุดเอกสาร (doc_submission_packages.package_status)

| Status | Label |
|--------|-------|
| `waiting_documents` | รอเอกสาร |
| `internal_review` | กำลังตรวจ |
| `customer_revision` | รอลูกค้าแก้ |
| `ready_to_submit` | พร้อมยื่น |
| `submitted_agency` | ยื่นแล้ว |
| `agency_revision` | หน่วยงานให้แก้ |
| `approved` | อนุมัติแล้ว |

### สถานะรายการเอกสาร (doc_review_checklists.status)

| Status | Label |
|--------|-------|
| `pending` | รอตรวจ |
| `checking` | กำลังตรวจ |
| `customer_revision` | ส่งกลับแก้ไข |
| `passed` | ผ่านแล้ว |
| `failed` | ไม่ผ่าน |

---

## 2. สถานะเปลี่ยนผ่าน (State Transitions)

### การอนุมัติภายใน

```
[เอกสารจำเป็นผ่านครบ 100%]
         ↓
    กดปุ่ม "อนุมัติภายใน"
         ↓
    Backend ตรวจ: doc_review_checklists WHERE is_required=1 AND status != 'passed' = 0
         ↓
    INSERT doc_review_approvals (approval_status = 'approved')
         ↓
    UPDATE doc_review_projects SET project_status = 'ready_to_submit'
         ↓
    UPDATE doc_submission_packages SET package_status = 'ready_to_submit' (ทุก package ที่ยังไม่ submitted)
```

**เงื่อนไขเปิดใช้ปุ่ม (Frontend):**
```javascript
const requiredItems = checklists.filter(c => c.is_required);
const requiredPassed = requiredItems.filter(c => c.status === 'passed').length;
const requiredTotal = requiredItems.length;
const isAllRequiredPassed = requiredTotal > 0 && requiredPassed === requiredTotal;
const canApprove = isAllRequiredPassed; // เอกสารจำเป็นผ่านครบ 100%
```

### การตีกลับ

```
    กดปุ่ม "ตีกลับ" (พร้อมเหตุผล)
         ↓
    INSERT doc_review_approvals (approval_status = 'rejected', comment = เหตุผล)
         ↓
    UPDATE doc_review_projects SET project_status = 'internal_review'
```

### การยื่นหน่วยงาน

```
    กดปุ่ม "บันทึกการยื่นหน่วยงาน"
         ↓
    Backend ตรวจ: project_status IN ('ready_to_submit', 'agency_revision', 'submitted_agency')
              OR มี approval ที่ status = 'approved'
         ↓
    INSERT doc_agency_submissions (agency_name, submission_round, submitted_date)
         ↓
    UPDATE doc_review_projects SET project_status = 'submitted_agency'
```

**เงื่อนไขเปิดใช้ปุ่ม (Frontend):**
```javascript
const projectStatus = pkg?.package_status;
const hasApproved = pkg?.latest_approval?.approval_status === 'approved';
const canSubmit = projectStatus === 'ready_to_submit' 
               || projectStatus === 'agency_revision' 
               || projectStatus === 'submitted_agency'
               || hasApproved;
```

### การตอบกลับจากหน่วยงาน

```
    บันทึกผลจากหน่วยงาน (agency_status)
         ↓
    agency_status = 'approved'      → project_status = 'approved'
    agency_status = 'revision_requested' → project_status = 'agency_revision'
    agency_status = 'resubmitted'   → project_status = 'submitted_agency'
    agency_status = 'pending'       → project_status = 'submitted_agency' (ไม่เปลี่ยน)
```

---

## 3. ตารางฐานข้อมูล (Tables)

### doc_review_projects
```sql
- id TEXT PRIMARY KEY
- project_code TEXT
- project_name TEXT
- customer_name TEXT
- customer_phone TEXT
- customer_email TEXT
- customer_line TEXT
- permit_type TEXT (pck2, a1, rong4, erc, sld)
- agency TEXT
- project_status TEXT DEFAULT 'waiting_documents'
- owner_id TEXT REFERENCES users(id)
- due_date DATE
- notes TEXT
- created_at DATETIME
- updated_at DATETIME
```

### doc_submission_packages
```sql
- id TEXT PRIMARY KEY
- project_id TEXT REFERENCES doc_review_projects(id)
- package_name TEXT
- permit_type TEXT
- agency TEXT
- package_status TEXT DEFAULT 'waiting_documents'
- due_date DATE
- sort_order INTEGER
- created_at DATETIME
- updated_at DATETIME
```

### doc_review_checklists
```sql
- id TEXT PRIMARY KEY
- project_id TEXT REFERENCES doc_review_projects(id)
- package_id TEXT REFERENCES doc_submission_packages(id)
- document_name TEXT
- description TEXT
- is_required INTEGER DEFAULT 1
- status TEXT DEFAULT 'pending'
- sort_order INTEGER
- created_at DATETIME
- updated_at DATETIME
```

### doc_review_approvals
```sql
- id TEXT PRIMARY KEY
- project_id TEXT REFERENCES doc_review_projects(id)
- approver_id TEXT REFERENCES users(id)
- approval_status TEXT (approved/rejected)
- comment TEXT
- approved_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### doc_agency_submissions
```sql
- id TEXT PRIMARY KEY
- project_id TEXT REFERENCES doc_review_projects(id)
- package_id TEXT REFERENCES doc_submission_packages(id)
- agency_name TEXT
- submission_round INTEGER DEFAULT 1
- submitted_date DATE
- agency_status TEXT DEFAULT 'pending'
- agency_comment TEXT
- response_date DATE
- next_action TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### doc_review_files
```sql
- id TEXT PRIMARY KEY
- checklist_id TEXT REFERENCES doc_review_checklists(id)
- file_name TEXT
- file_path TEXT
- file_size INTEGER
- mime_type TEXT
- version INTEGER DEFAULT 1
- uploaded_by TEXT REFERENCES users(id)
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### doc_review_comments
```sql
- id TEXT PRIMARY KEY
- checklist_id TEXT REFERENCES doc_review_checklists(id)
- reviewer_id TEXT REFERENCES users(id)
- comment_type TEXT (internal/agency)
- review_status TEXT (passed/failed/needs_revision)
- comment TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### document_receipts
```sql
- id TEXT PRIMARY KEY
- checklist_item_id TEXT REFERENCES doc_review_checklists(id)
- package_id TEXT REFERENCES doc_submission_packages(id)
- received_from TEXT
- received_channel TEXT (line/email/drive/paper/other)
- received_date DATE
- revision_round INTEGER DEFAULT 1
- notes TEXT
- created_by TEXT REFERENCES users(id)
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### document_issues
```sql
- id TEXT PRIMARY KEY
- checklist_item_id TEXT REFERENCES doc_review_checklists(id)
- package_id TEXT REFERENCES doc_submission_packages(id)
- issue_source TEXT (internal/agency)
- description TEXT
- required_action TEXT
- status TEXT DEFAULT 'open' (open/resolved)
- revision_round INTEGER DEFAULT 1
- created_by TEXT REFERENCES users(id)
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- resolved_at DATETIME
```

### doc_review_template_checklists
```sql
- id TEXT PRIMARY KEY
- name TEXT
- permit_type TEXT
- agency TEXT
- is_active INTEGER DEFAULT 1
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### doc_review_template_items
```sql
- id TEXT PRIMARY KEY
- template_id TEXT REFERENCES doc_review_template_checklists(id)
- document_name TEXT
- description TEXT
- is_required INTEGER DEFAULT 1
- sort_order INTEGER
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 4. API Endpoints

### Projects
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/doc-review` | ดูรายการโครงการทั้งหมด |
| POST | `/api/doc-review` | สร้างโครงการใหม่ |
| GET | `/api/doc-review/:id` | ดูรายละเอียดโครงการ |
| PUT | `/api/doc-review/:id` | อัปเดตโครงการ |
| DELETE | `/api/doc-review/:id` | ลบโครงการ |
| GET | `/api/doc-review/dashboard/summary` | สรุปสถานะทั้งหมด |

### Packages
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/doc-review/projects/:projectId/packages` | ดูชุดเอกสารของโครงการ |
| POST | `/api/doc-review/projects/:projectId/packages` | สร้างชุดเอกสารใหม่ |
| GET | `/api/doc-review/packages/:packageId` | ดูรายละเอียดชุดเอกสาร |
| PUT | `/api/doc-review/packages/:packageId` | อัปเดตชุดเอกสาร |
| DELETE | `/api/doc-review/packages/:packageId` | ลบชุดเอกสาร |
| POST | `/api/doc-review/packages/:packageId/generate-checklist` | สร้าง checklist จาก template |

### Checklists
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/doc-review/projects/:projectId/checklists` | ดูรายการเอกสาร |
| POST | `/api/doc-review/projects/:projectId/checklists` | เพิ่มรายการเอกสาร |
| POST | `/api/doc-review/projects/:projectId/checklists/from-template` | สร้างจาก template |
| PUT | `/api/doc-review/checklists/:id` | อัปเดตรายการ (status, is_required) |
| DELETE | `/api/doc-review/checklists/:id` | ลบรายการ |

### Files
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/checklists/:checklistId/files` | อัปโหลดไฟล์ (multipart) |
| GET | `/api/doc-review/checklists/:checklistId/files` | ดูไฟล์ของรายการ |
| GET | `/api/doc-review/files/:fileId/download` | ดาวน์โหลดไฟล์ |
| DELETE | `/api/doc-review/files/:fileId` | ลบไฟล์ |

### Comments
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/checklists/:checklistId/comments` | เพิ่มคอมเมนต์ |
| GET | `/api/doc-review/checklists/:checklistId/comments` | ดูคอมเมนต์ |

### Approvals
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/projects/:projectId/approve` | อนุมัติภายใน |
| POST | `/api/doc-review/projects/:projectId/reject` | ตีกลับ |
| GET | `/api/doc-review/projects/:projectId/approvals` | ดูประวัติอนุมัติ |

### Agency Submissions
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/projects/:projectId/submit` | บันทึกการยื่นหน่วยงาน |
| PUT | `/api/doc-review/submissions/:id` | อัปเดตผลจากหน่วยงาน |
| DELETE | `/api/doc-review/submissions/:id` | ลบรายการยื่น |
| GET | `/api/doc-review/submissions` | ดูรายการยื่นทั้งหมด |
| GET | `/api/doc-review/projects/:projectId/submissions` | ดูรายการยื่นของโครงการ |

### Receipts
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/receipts` | บันทึกการรับเอกสาร |
| GET | `/api/doc-review/receipts/checklists/:checklistId` | ดูประวัติรับ |

### Issues
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/issues` | สร้างปัญหา |
| PUT | `/api/doc-review/issues/:id/resolve` | แก้ไขปัญหาแล้ว |
| GET | `/api/doc-review/packages/:packageId/issues` | ดูปัญหาของชุดเอกสาร |

### Correction Reports
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/doc-review/correction-reports` | สร้างรายงานส่งลูกค้า |
| GET | `/api/doc-review/correction-reports/:id` | ดูรายงาน |

### Template Checklists
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/doc-review/template-checklists` | ดูรายการ template |
| POST | `/api/doc-review/template-checklists` | สร้าง template |
| PUT | `/api/doc-review/template-checklists/:id` | อัปเดต template |
| DELETE | `/api/doc-review/template-checklists/:id` | ลบ template |
| POST | `/api/doc-review/template-checklists/:id/copy` | คัดลอก template |

---

## 5. Business Rules

### 5.1 การอนุมัติภายใน
- ต้องมีเอกสารจำเป็น (is_required = 1) ผ่านครบ 100% ก่อน
- หนึ่งโครงการอนุมัติได้หลายครั้ง (แต่ละชุดเอกสาร)
- หลังอนุมัติ จะอัปเดต project_status และ package_status เป็น `ready_to_submit`

### 5.2 การยื่นหน่วยงาน
- ต้องอนุมัติภายในก่อน (project_status = ready_to_submit หรือมี approval record)
- หนึ่งโครงการยื่นได้หลายรอบ (submission_round auto-increment)
- บันทึกข้อมูล: หน่วยงาน, วันที่ยื่น, หมายเหตุ

### 5.3 การตอบกลับจากหน่วยงาน
- `approved` → เปลี่ยน project_status เป็น `approved`
- `revision_requested` → เปลี่ยน project_status เป็น `agency_revision`
- `resubmitted` → เปลี่ยน project_status เป็น `submitted_agency`

### 5.4 ปัญหา (Issues)
- สร้างได้จากหน้าตรวจเอกสาร (internal) หรือจากหน่วยงาน (agency)
- สถานะ: open → resolved
- สร้างรายงานส่งลูกค้า (correction report) จากปัญหาที่ open

### 5.5 Template Checklists
- สร้าง template สำเร็จรูปตามประเภทใบอนุญาต
- เมื่อสร้างชุดเอกสาร可以从 template สร้าง checklist items อัตโนมัติ
- แต่ละ template มีหลาย items พร้อม is_required

---

## 6. Frontend Components

### Pages
| File | Route | คำอธิบาย |
|------|-------|----------|
| `DocReviewDashboard.jsx` | `/doc-review` | แดชบอร์ดสรุปสถานะ |
| `DocReviewNew.jsx` | `/doc-review/new` | สร้างโครงการใหม่ |
| `DocReviewDetail.jsx` | `/doc-review/:id` | รายละเอียดโครงการ + ชุดเอกสาร |
| `DocReviewTemplateChecklists.jsx` | `/doc-review/templates` | จัดการ Template |
| `DocReviewAgencyTracking.jsx` | `/doc-review/agency-tracking` | ติดตามการยื่นหน่วยงาน |
| `DocReviewCorrectionReport.jsx` | `/doc-review/correction-report/:id` | รายงานส่งลูกค้า |

### Components ใน DocReviewDetail.jsx
| Component | คำอธิบาย |
|-----------|----------|
| `PackageCard` | การ์ดแสดงชุดเอกสาร |
| `PackageDetail` | รายละเอียดชุดเอกสาร + tabs |
| `AddPackageModal` | ฟอร์มเพิ่มชุดเอกสาร |
| `AddChecklistItemModal` | ฟอร์มเพิ่มรายการเอกสาร |
| `CommentModal` | ฟอร์มตรวจเอกสาร (อนุมัติ/ตีกลับ) |
| `ReceiptModal` | บันทึกรับเอกสารจากลูกค้า |
| `CreateIssueModal` | สร้างปัญหา |
| `AgencySubmitModal` | บันทึกการยื่นหน่วยงาน |

---

## 7. การคำนวณ Progress

```javascript
// Progress ของชุดเอกสาร
const requiredItems = checklists.filter(c => c.is_required);
const requiredPassed = requiredItems.filter(c => c.status === 'passed').length;
const requiredTotal = requiredItems.length;
const requiredProgress = requiredTotal > 0 ? Math.round((requiredPassed / requiredTotal) * 100) : 0;

// ปุ่มอนุมัติภายในเปิดใช้เมื่อ
const canApprove = requiredTotal > 0 && requiredPassed === requiredTotal; // 100%

// ปุ่มยื่นหน่วยงานเปิดใช้เมื่อ
const canSubmit = package_status === 'ready_to_submit' 
               || package_status === 'agency_revision' 
               || package_status === 'submitted_agency'
               || latest_approval?.approval_status === 'approved';
```

---

## 8. Permission Matrix

| Action | Admin | Engineer | Staff | Client |
|--------|-------|----------|-------|--------|
| ดูแดชบอร์ด | ✓ | ✓ | ✓ | - |
| สร้างโครงการ | ✓ | ✓ | ✓ | - |
| แก้ไขโครงการ | ✓ | ✓ | - | - |
| ลบโครงการ | ✓ | - | - | - |
| ตรวจเอกสาร | ✓ | ✓ | - | - |
| อนุมัติภายใน | ✓ | ✓ | - | - |
| ยื่นหน่วยงาน | ✓ | ✓ | - | - |
| จัดการ Template | ✓ | ✓ | - | - |
| ติดตามยื่นหน่วยงาน | ✓ | ✓ | ✓ | - |
