# Document Review & Agency Submission Module

## Overview
ระบบตรวจเอกสารและยื่นหน่วยงานสำหรับบริษัทรับยื่นใบอนุญาต Solar

## Workflow (14 steps)
```
สร้างโครงการ → เลือก Template → Generate Checklist → ตรวจ → Comment
→ Export ส่งลูกค้า → ลูกค้าแก้ → ตรวจซ้ำ → อนุมัติภายใน
→ ยื่นหน่วยงาน → หน่วยงานให้แก้ → แก้ไข → ยื่นใหม่ → อนุมัติ
```

## Source of Truth
| Table | Status Field | Scope |
|-------|-------------|-------|
| `submission_packages` | `status` | **สถานะหลัก** — Dashboard/Pipeline/Table ใช้ตัวนี้ |
| `package_checklist_items` | `status` | สถานะระดับเอกสาร |
| `document_issues` | `status` | สถานะปัญหา |
| `agency_submissions` | `agency_status` | สถานะการยื่นหน่วยงาน |

## Unified Status Set (7 states)
| Status | Label | Description |
|--------|-------|-------------|
| `waiting_documents` | รอเอกสาร | รอรับเอกสารจากลูกค้า |
| `internal_review` | กำลังตรวจ | ทีมงานกำลังตรวจ Checklist |
| `customer_revision` | รอลูกค้าแก้ | ส่ง Comment กลับลูกค้าแล้ว |
| `ready_to_submit` | พร้อมยื่น | ตรวจผ่านหมด พร้อมยื่นหน่วยงาน |
| `submitted_agency` | ยื่นแล้ว | ยื่นให้หน่วยงานแล้ว |
| `agency_revision` | หน่วยงานให้แก้ | หน่วยงานส่งคอมเมนต์ให้แก้ |
| `approved` | อนุมัติแล้ว | หน่วยงานอนุมัติ ปิด Package |

## Business Rules
- Issue ต้องมีเมื่อ checklist item = need_revision
- Issue ยังไม่ resolved → item ห้ามเป็น passed_internal
- Required item ยังไม่ผ่าน → package ห้ามเป็น ready_to_submit
- ยังไม่ internal approved → ห้ามยื่นหน่วยงาน
- หน่วยงานให้แก้ → สร้าง issue_source = agency
- ยื่นใหม่ → เพิ่ม submission_round
- ลูกค้าส่งแก้กลับ → เพิ่ม revision_round
- Agency approved → package = approved
- Package ทุกตัว approved → project = approved/closed

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doc-review` | List projects |
| POST | `/api/doc-review` | Create project |
| GET | `/api/doc-review/:id` | Project detail |
| GET | `/api/doc-review/dashboard/summary` | KPI summary |
| GET | `/api/doc-review/projects/:id/packages` | List packages |
| POST | `/api/doc-review/projects/:id/packages` | Create package |
| POST | `/api/doc-review/packages/:id/generate-checklist` | Generate checklist from template |
| POST | `/api/doc-review/checklists/:id/comments` | Add review comment |
| POST | `/api/doc-review/receipts` | Record document receipt |
| POST | `/api/doc-review/issues` | Create issue |
| PUT | `/api/doc-review/issues/:id/resolve` | Resolve issue |
| POST | `/api/doc-review/correction-reports` | Create correction report |
| GET | `/api/doc-review/correction-reports/:id` | Get report detail |
| POST | `/api/doc-review/projects/:id/submit` | Submit to agency |
| PUT | `/api/doc-review/submissions/:id` | Update agency submission |
| GET | `/api/doc-review/projects/:id/submissions` | List submissions |

## Frontend Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/doc-review` | Pipeline + Package table |
| Project Detail | `/doc-review/:id` | Packages + Stage |
| Package Detail | `/doc-review/:id` (selected package) | Checklist + Issues + Approval + Agency |
| Template Checklists | `/doc-review/templates` | CRUD templates |
| Agency Tracking | `/doc-review/agency-tracking` | Cross-project submission history |
| Correction Report | `/doc-review/correction-report/:id` | View + Export PDF |

## Files
### Backend Routes
- `backend/src/routes/doc-review-projects.js`
- `backend/src/routes/doc-review-packages.js`
- `backend/src/routes/doc-review-checklists.js`
- `backend/src/routes/doc-review-template-checklists.js`
- `backend/src/routes/doc-review-receipts.js`
- `backend/src/routes/doc-review-issues.js`
- `backend/src/routes/doc-review-correction-reports.js`
- `backend/src/routes/doc-review-submissions.js`
- `backend/src/routes/doc-review-approvals.js`
- `backend/src/routes/doc-review-comments.js`
- `backend/src/routes/doc-review-files.js`

### Frontend Pages
- `frontend/src/pages/DocReviewDashboard.jsx`
- `frontend/src/pages/DocReviewDetail.jsx`
- `frontend/src/pages/DocReviewNew.jsx`
- `frontend/src/pages/DocReviewTemplateChecklists.jsx`
- `frontend/src/pages/DocReviewAgencyTracking.jsx`
- `frontend/src/pages/DocReviewCorrectionReport.jsx`

### Migrations
- `backend/src/migrations/005_document_workflow.cjs`
- `backend/src/migrations/006_doc_review_workflow.cjs`
- `backend/src/migrations/007_doc_review_packages.cjs`
- `backend/src/migrations/008_document_review_workflow.cjs`

### Tests
- `backend/__tests__/doc-review.test.js` (26 test cases)
