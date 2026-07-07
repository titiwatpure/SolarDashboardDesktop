# รายงานสถานะในระบบ Doc Review

## 1. ตารางสถานะทั้งหมด

### 1.1 Package Status (หน้า Dashboard อ้างอิง)

| ค่า | Label | สี |
|-----|-------|-----|
| `waiting_documents` | รอเอกสาร | เทา |
| `internal_review` | กำลังตรวจ | น้ำเงิน |
| `customer_revision` | รอลูกค้าแก้ | ส้ม |
| `ready_to_submit` | พร้อมยื่น | ม่วง |
| `submitted_agency` | ยื่นแล้ว | คราม |
| `agency_revision` | หน่วยงานให้แก้ | แดง |
| `approved` | อนุมัติแล้ว | เขียว |

**ที่มา**: คำนวณจาก checklist items ของ package นั้นๆ

### 1.2 Checklist Status (หน้า Detail อ้างอิง)

| ค่า | Label | เปลี่ยนจาก |
|-----|-------|-----------|
| `pending` | รอตรวจ | ค่าเริ่มต้น |
| `checking` | กำลังตรวจ | หลังบันทึกรับเอกสาร |
| `customer_revision` | ส่งกลับแก้ไข | ตรวจไม่ผ่าน |
| `passed` | ผ่านแล้ว | ตรวจผ่าน |
| `failed` | ไม่ผ่าน | ตรวจไม่ผ่าน |

### 1.3 Agency Submission Status

| ค่า | Label |
|-----|-------|
| `pending` | รอตรวจสอบ |
| `approved` | อนุมัติแล้ว |
| `revision_requested` | ให้แก้ไข |
| `resubmitted` | ยื่นใหม่แล้ว |

### 1.4 Project Status (sync จาก package)

| ค่า | Label | ที่มา |
|-----|-------|-------|
| `waiting_documents` | รอเอกสาร | ทุก package เป็น waiting |
| `internal_review` | กำลังตรวจ | มี package ที่ internal_review |
| `customer_revision` | รอลูกค้าแก้ | มี package ที่ customer_revision |
| `ready_to_submit` | พร้อมยื่น | มี package ที่ ready_to_submit |
| `submitted_agency` | ยื่นแล้ว | มี package ที่ submitted_agency |
| `agency_revision` | หน่วยงานให้แก้ | มี package ที่ agency_revision |
| `approved` | อนุมัติแล้ว | ทุก package เป็น approved |

---

## 2. Flow การเปลี่ยนสถานะ

### Flow ปกติ
```
waiting_documents → internal_review → ready_to_submit → submitted_agency → approved
```

### Flow เมื่อมีปัญหา
```
internal_review → customer_revision (ตรวจไม่ผ่าน)
customer_revision → internal_review (ลูกค้าแก้ไขแล้ว)
submitted_agency → agency_revision (หน่วยงานให้แก้)
agency_revision → internal_review (แก้ไขแล้ว)
```

---

## 3. โค้ดที่เกี่ยวข้อง

### Backend
- `doc-review-checklists.js` → `recalculatePackageStatus()` + `syncProjectStatus()`
- `doc-review-comments.js` → เรียก recalculate หลัง update status
- `doc-review-submissions.js` → set submitted_agency / agency_revision / approved

### Frontend
- `DocReviewDashboard.jsx` → แสดง `package_status` จาก API
- `DocReviewDetail.jsx` → แสดง `checklist.status`

---

## 4. ปัญหาที่พบ

SOL-2026-003 (SLD) มี checklist 6/6 passed แต่ Dashboard แสดง "รอเอกสาร"

**สาเหตุ**: `package_status` ไม่ได้อัปเดตหลัง checklist ถูกตรวจผ่าน

**สถานะปัจจุบัน**: แก้แล้ว (recalculatePackageStatus เรียกหลัง batch-approve + batch-receive + batch-reject + comment)
