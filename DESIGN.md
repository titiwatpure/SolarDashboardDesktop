# DESIGN.md — Executive Report (1-Page)

## Identity
**Information Designer** — ผู้ออกแบบข้อมูลสำหรับผู้บริหาร คำถามแรก: "เปรียบเทียบอะไร?"

## Objective
สร้างรายงานสรุปสำหรับผู้บริหาร 1 หน้ากระดาษ (A4) ที่เข้าใจได้ทันทีใน 30 วินาที แสดงสถานะโครงการ Solar ทั้งหมดในรูปแบบที่ตัดสินใจได้เร็ว

## Visual Foundations

### Layout
- **Size**: A4 portrait (210mm × 297mm)
- **Margins**: 15mm ทุกด้าน
- **Grid**: 12 คอลัมน์, gutter 8mm
- **Sections**: 5 sections แนวตั้ง ไม่มี scroll

### Color Palette
| Token | Hex | ใช้สำหรับ |
|-------|-----|----------|
| `--primary` | #1E40AF | หัวข้อ, ตัวเลขสำคัญ |
| `--success` | #059669 | สถานะสำเร็จ, COD แล้ว |
| `--warning` | #D97706 | สถานะเตือน, ติดปัญหาเล็กน้อย |
| `--danger` | #DC2626 | สถานะวิกฤต, เกินกำหนด |
| `--slate-50` | #F8FAFC | พื้นหลัง |
| `--slate-100` | #F1F5F9 | พื้นหลัง section |
| `--slate-200` | #E2E8F0 | เส้นแบ่ง |
| `--slate-600` | #475569 | ข้อความรอง |
| `--slate-900` | #0F172A | ข้อความหลัก |

### Typography
| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Report Title | IBM Plex Sans Thai | 18px | 700 | 1.2 |
| Section Header | IBM Plex Sans Thai | 12px | 600 | 1.3 |
| KPI Number | IBM Plex Sans Thai | 24px | 700 | 1.0 |
| KPI Label | IBM Plex Sans Thai | 9px | 400 | 1.2 |
| Body Text | IBM Plex Sans Thai | 10px | 400 | 1.4 |
| Table Header | IBM Plex Sans Thai | 9px | 600 | 1.3 |
| Table Cell | IBM Plex Sans Thai | 9px | 400 | 1.3 |

### Spacing
- Section gap: 12px
- Card padding: 10px
- Table cell padding: 6px 8px

## Structure (5 Sections)

### Section 1: Header (top)
- ชื่อบริษัท + โลโก้ (ซ้าย)
- ชื่อรายงาน: "รายงานสรุปโครงการ Solar" (กลาง)
- วันที่อัปเดต (ขวา)
- เส้นแบ่งสีน้ำเงิน 2px

### Section 2: KPI Summary (7 ตัวเลข)
- แถวเดียว 7 คอลัมน์
- แต่ละตัว: ตัวเลขใหญ่ + ชื่อสั้น + สี status
- เรียง: ทั้งหมด | แจ้งยกเว้น | ขอใบอนุญาต | กำลังทำ | ติดปัญหา | เสร็จแล้ว | ความเสี่ยงวิกฤต

### Section 3: สถานะตามขั้นตอน (Pipeline)
- Horizontal bar chart 7 ขั้นตอน
- แต่ละขั้นตอน: ชื่อ + จำนวนโครงการ + bar สี
- สี: เสร็จ=เขียว, กำลังทำ=น้ำเงิน, ติดปัญหา=แดง, รอดำเนินการ=เทา

### Section 4: โครงการต้องติดตาม (Table)
- ตาราง 5 คอลัมน์: รหัส | ชื่อ | ขั้นตอน | สถานะ | วันที่อัปเดต
- แสดงเฉพาะ: ติดปัญหา + ความเสี่ยงสูง/วิกฤต + เกินกำหนด
- จำกัด 10 แถวแรก

### Section 5: สรุปและข้อเสนอแนะ (footer)
- ข้อความ 2-3 บรรทัดสรุปสถานการณ์
- ข้อเสนอแนะ 1-2 ข้อ
- ลายเซ็นผู้จัดทำ (มุมขวาล่าง)

## Anti-Patterns
- ❌ ไม่ใช้ emoji เป็น decoration
- ❌ ไม่ใช้ gradient หรือ shadow มากเกินไป
- ❌ ไม่ใช้สีมากกว่า 4 สีหลัก
- ❌ ไม่ใส่ข้อมูลเกิน 1 หน้า
- ❌ ไม่ใช้ animation (เป็น PDF/Print)

## Decision Trace

| Decision | Reason | Alternatives | Tradeoff |
|----------|--------|--------------|----------|
| ใช้ A4 portrait | ขนาดกระดาษมาตรฐาน พิมพ์ได้ทันที | A4 landscape, Letter | พื้นที่คอลัมน์น้อยลง |
| 7 KPI cards แถวเดียว | เห็นตัวเลขสำคัญทั้งหมดในครั้งเดียว | 2 แถว, ตาราง | ตัวเลขเล็กลง |
| Horizontal bar สำหรับ Pipeline | เปรียบเทียบจำนวนโครงการแต่ละขั้นตอนง่าย | Donut chart, Table | ไม่เห็นสัดส่วน |
| ตาราง 10 แถวแรก | ไม่เกิน 1 หน้า โฟกัสเฉพาะที่ต้องติดตาม | ทั้งหมด, 5 แถว | อาจพลาดโครงการสำคัญ |
| IBM Plex Sans Thai | ฟอนต์ไทยชัดเจน อ่านง่าย | Sarabun, Prompt | ขนาดไฟล์ใหญ่กว่า |
| ไม่ใช้ emoji | ดูเป็นทางการ เหมาะกับผู้บริหาร | มี emoji | ดูน้อยลง |
