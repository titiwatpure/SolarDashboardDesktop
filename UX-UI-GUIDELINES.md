# หลักการ UX/UI Design — Solar Dashboard

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## เป้าหมายการออกแบบ

- ออกแบบโดยยึดผู้ใช้งานเป็นศูนย์กลาง (User-Centered Design)
- ลดจำนวนคลิกให้น้อยที่สุด
- ลดขั้นตอนการทำงานที่ไม่จำเป็น
- เพิ่มความเร็วในการทำงาน
- รองรับข้อมูลจำนวนมาก
- ออกแบบให้เรียนรู้ได้ง่าย
- รองรับการขยายระบบในอนาคต

---

## หลักการ UX

ก่อนออกแบบทุกครั้งให้วิเคราะห์:

- User Persona
- User Journey / User Flow
- Business Workflow
- Pain Point
- Goal ของผู้ใช้งาน
- ความถี่ในการใช้งาน
- ความสำคัญของข้อมูลแต่ละส่วน

**ห้าม** วางองค์ประกอบแบบสุ่ม — ทุกองค์ประกอบต้องมีเหตุผลรองรับ

---

## หลักการ UI

- เรียบง่าย (Simple)
- สะอาด (Clean)
- ทันสมัย (Modern)
- เป็นมืออาชีพ (Professional)
- ใช้งานง่าย (Usability)
- อ่านง่าย (Readable)
- มีลำดับความสำคัญของข้อมูล (Visual Hierarchy)
- ใช้พื้นที่หน้าจออย่างคุ้มค่า

---

## Layout

- Grid System (8px Grid)
- Responsive + Adaptive Layout
- Consistent Spacing
- Alignment ที่ถูกต้อง
- White Space อย่างเหมาะสม

---

## Color System

- Primary / Secondary / Success / Warning / Error / Info
- Background / Surface / Border / Typography Color
- ต้องผ่าน WCAA AA หรือสูงกว่า

**Solar Dashboard Palette:**
- Primary: blue-600 (#2563eb)
- Success: emerald-500 (#10b981)
- Warning: amber-500 (#f59e0b)
- Error: red-500 (#ef4444)
- Background: slate-100
- Surface: white
- Border: slate-200

---

## Typography

- Font: Noto Sans Thai (สำหรับภาษาไทย)
- Heading Scale: text-xl / text-2xl / text-3xl / text-4xl
- Body Scale: text-sm / text-base
- Line Height: 1.5-1.6

---

## Component Standards

ทุก Component ต้องมี State:
- Default / Hover / Active / Focus / Disabled / Loading / Error / Success

**Reusable Components ที่ใช้ในโปรเจกต์:**
Button, Input, Select, Search, Table, Card, Modal, Tabs, Badge, Chip, Toast, Alert, Timeline, Progress, Skeleton Loading, Pagination

---

## Form Design

- แบ่ง Section ชัดเจน
- Validation ทันที (real-time)
- Required Field ชัดเจน
- Keyboard Navigation
- Error message ใกล้ field ที่ผิด
- ใช้ inline edit เมื่อแก้ไขเล็กน้อย

---

## Data Table

- Search / Sort / Filter
- Sticky Header
- Pagination
- Bulk Action (เมื่อมี multi-select)
- Export
- Responsive (horizontal scroll บน mobile)

---

## Dashboard

- แสดง KPI สำคัญก่อน
- ใช้ Chart ที่เหมาะกับข้อมูล
- Drill Down ได้
- หลีกเลี่ยงข้อมูลแน่นจนอ่านยาก

---

## Workflow Design

- Step Progress ชัดเจน
- Timeline สำหรับประวัติ
- Approval Flow
- Document Status Badge
- Notification + Activity Log

---

## UX Performance

**ลด:**
- จำนวนคลิก
- การเลื่อนหน้าจอ
- การกรอกข้อมูลซ้ำ

**เพิ่ม:**
- Shortcut Key
- Auto Complete
- Smart Search
- Recent Items
- Quick Action

---

## Accessibility

- Keyboard Navigation
- Focus Indicator
- ARIA Label
- Color Contrast WCAG AA

---

## Design Tokens (Solar Dashboard)

```css
/* Spacing */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;

/* Border Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 28px;

/* Shadow */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
```

---

## ข้อห้าม

- ห้ามออกแบบตามความสวยงามเพียงอย่างเดียว
- ห้ามใช้สีมากเกินไป
- ห้ามใช้ Animation ที่รบกวนการทำงาน
- ห้ามซ่อนข้อมูลสำคัญ
- ห้ามเพิ่มจำนวนคลิกโดยไม่จำเป็น
- ห้ามทำให้ผู้ใช้ต้องคิดว่าต้องกดอะไรต่อ
- ห้ามเปลี่ยน Workflow ธุรกิจโดยไม่ได้รับอนุญาต

---

## การตรวจสอบก่อนส่งงาน

- [ ] UX ผ่าน
- [ ] UI ผ่าน
- [ ] Responsive ผ่าน
- [ ] Accessibility ผ่าน
- [ ] Consistency ผ่าน
- [ ] Performance ผ่าน
- [ ] Readability ผ่าน
- [ ] Usability ผ่าน

