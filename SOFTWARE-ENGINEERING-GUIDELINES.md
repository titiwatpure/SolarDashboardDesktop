# หลักการ Software Engineering — Solar Dashboard

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## หลักการทำงาน

- วิเคราะห์ Requirement ให้ครบถ้วนก่อนเริ่มเขียนโค้ด
- ห้ามเดา Requirement
- ออกแบบโครงสร้างก่อนลงมือเขียนโค้ด
- คิดถึง Scalability / Maintainability / Performance / Security / Data Integrity / Concurrency
- ลด Technical Debt

---

## มาตรฐานโค้ด

- อ่านง่าย, ชื่อ Function/Variable สื่อความหมาย
- ห้าม Magic Number, ห้ามโค้ดซ้ำ (DRY)
- ใช้ SOLID / KISS / YAGNI / Separation of Concerns
- Modular Design / Clean Architecture / Clean Code
- Error Handling ครบทุกกรณี
- Validation ทุก Input, Sanitize Input, Escape Output

---

## Database

- Normalization / PK / FK / Constraint / Index
- Transaction เมื่อจำเป็น, ป้องกัน Deadlock
- ป้องกัน SQL Injection
- ตรวจสอบ Query Performance

---

## API

- RESTful standards / Response Structure 一致
- Status Code ถูกต้อง
- Validation ก่อน DB
- Pagination / Filtering / Sorting
- Authentication / Authorization / Rate Limiting

---

## Frontend

- Component แยกหน้าที่ชัดเจน / Reusable
- Responsive / Loading / Empty / Error State
- Accessibility (ARIA)
- ป้องกัน Memory Leak
- ลด Re-render ที่ไม่จำเป็น

---

## Backend Layers

```
Presentation → Controller → Service → Repository → Database
```

Business Logic ต้องอยู่ใน Service เท่านั้น

---

## Security Checklist

- SQL Injection / XSS / CSRF
- Authentication / Authorization
- File Upload / Path Traversal
- Sensitive Data Exposure / Secret Management
- JWT Validation / Password Hashing (bcrypt)
- Input Validation

---

## Testing

ทุกครั้งที่แก้ไขโค้ด:
- Unit Test / Integration Test / Regression Test
- Edge Case / Negative Case

---

## Performance

- Time/Space Complexity
- Database Query optimization
- N+1 Problem detection
- Lazy Loading / Caching

---

## Documentation

ทุก Function ต้องมี Comment ภาษาไทย:
- หน้าที่ / Input / Output / ข้อควรระวัง

---

## การแก้ไขโค้ด

**ก่อนแก้ไข:**
1. วิเคราะห์ปัญหา
2. สาเหตุ
3. ผลกระทบ
4. แนวทางแก้ไข
5. ความเสี่ยง
6. วิธีทดสอบ

**หลังแก้ไข:**
- ไฟล์ที่แก้ / จำนวนบรรทัด
- สิ่งที่เปลี่ยน / สิ่งที่ไม่ได้เปลี่ยน
- Backward Compatibility
- ความเสี่ยงที่เหลือ

---

## ข้อห้าม

- ห้ามแก้ไขไฟล์ที่ไม่เกี่ยวข้อง
- ห้ามเปลี่ยนชื่อ Function โดยไม่มีเหตุผล
- ห้ามเปลี่ยน API เดิมจนทำให้ระบบอื่นเสีย
- ห้ามลบโค้ดเดิม หากยังไม่มีหลักฐานว่าไม่ถูกใช้งาน
- ห้าม Refactor ทั้งระบบ หากไม่ได้รับอนุญาต
- ห้ามสร้าง Dependency ใหม่โดยไม่จำเป็น
- ห้ามทำให้ระบบเดิมใช้งานไม่ได้ (Backward Compatibility)
