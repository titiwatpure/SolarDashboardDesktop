import { useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Zap, CheckSquare, Users, FileText,
  BarChart3, Wallet, Building2, Map, Settings, ClipboardList, Receipt,
  ShieldCheck, UserCircle, LayoutGrid, HelpCircle
} from 'lucide-react';

const sections = [
  {
    id: 'overview',
    title: 'ภาพรวมระบบ',
    icon: LayoutGrid,
    content: `Solar Dashboard เป็นระบบจัดการโครงการพลังงานแสงอาทิตย์ครบวงจร รองรับการติดตามโครงการตั้งแต่สำรวจจนถึง COD (Commercial Operation Date)

**ฟีเจอร์หลัก:**
- ติดตามสถานะโครงการแบบ Real-time
- จัดการเอกสารและสัญญา
- ระบบบัญชีรายรับ-รายจ่าย
- รายงานและกราฟวิเคราะห์
- รองรับ 4 บทบาท: Admin, Engineer, Staff, Client`
  },
  {
    id: 'projects',
    title: 'จัดการโครงการ',
    icon: Zap,
    steps: [
      'ไปที่เมนู "โครงการทั้งหมด" ใน Sidebar',
      'กดปุ่ม "+ เพิ่มโครงการ" เพื่อสร้างโครงการใหม่',
      'กรอกข้อมูล: ชื่อโครงการ, จังหวัด, ขนาด (kW), ลูกค้า',
      'เลือกขั้นตอนเริ่มต้น (Survey → COD)',
      'กำหนดผู้รับผิดชอบและระดับความเสี่ยง',
      'กด "บันทึก" เพื่อสร้างโครงการ'
    ],
    tips: [
      'รหัสโครงการสร้างอัตโนมัติ เช่น P6905-001',
      'สามารถกรองตามสถานะ, ขั้นตอน, จังหวัด',
      'กดที่ชื่อโครงการเพื่อดูรายละเอียดและ Timeline'
    ]
  },
  {
    id: 'steps',
    title: 'ปฏิบัติงาน (7 ขั้นตอน)',
    icon: CheckSquare,
    content: `ขั้นตอนดำเนินงานแบ่งเป็น 7 ขั้น:

1. **Survey** - สำรวจพื้นที่
2. **Design** - ออกแบบระบบ
3. **ERC** - ขออนุญาต กกพ.
4. **Grid** - ขอเชื่อมต่อสายส่ง
5. **Construction** - ก่อสร้าง
6. **Testing** - ทดสอบระบบ
7. **COD** - เปิดดำเนินการเชิงพาณิชย์`,
    tips: [
      'แต่ละขั้นตอนมี Checkpoint ที่ต้องตรวจสอบ',
      'อัปเดตสถานะผ่านหน้า "ปฏิบัติงาน"',
      'Timeline บันทึกการเปลี่ยนแปลงทั้งหมดอัตโนมัติ'
    ]
  },
  {
    id: 'tasks',
    title: 'งานที่มอบหมาย',
    icon: ClipboardList,
    steps: [
      'ไปที่เมนู "งานที่มอบหมาย"',
      'กด "+ สร้างงาน" เพื่อเพิ่มงานใหม่',
      'กรอก: ชื่องาน, รายละเอียด, วันครบกำหนด',
      'เลือกผู้รับผิดชอบและระดับความสำคัญ',
      'เลือกโครงการที่เกี่ยวข้อง (ถ้ามี)',
      'กด "บันทึก"'
    ],
    tips: [
      'ระดับความสำคัญ: Urgent > High > Medium > Low',
      'สถานะงาน: Pending → In Progress → Completed',
      'งานที่เลยกำหนดจะแสดงสีแดง'
    ]
  },
  {
    id: 'documents',
    title: 'จัดการเอกสาร',
    icon: FileText,
    steps: [
      'ไปที่เมนู "เอกสาร"',
      'กดปุ่ม "อัปโหลด" เพื่อเพิ่มเอกสาร',
      'เลือกไฟล์จากเครื่อง (รองรับทุกประเภท)',
      'เลือกโครงการที่เกี่ยวข้อง',
      'กรอกชื่อเอกสารและคำอธิบาย',
      'กด "อัปโหลด"'
    ],
    tips: [
      'เอกสารจัดเก็บตามโฟลเดอร์โครงการอัตโนมัติ',
      'สามารถดาวน์โหลดผ่าน native save dialog ใน Electron',
      'กรองเอกสารตามโครงการได้'
    ]
  },
  {
    id: 'accounting',
    title: 'ระบบบัญชี',
    icon: Wallet,
    content: `ระบบบัญชีแบ่งเป็น 3 ส่วนหลัก:

**1. รายการบัญชี (Transactions)**
- บันทึกรายรับ-รายจ่าย
- แบ่งหมวดหมู่: เงินมัดจำ, ค่าวัสดุ, ค่าแรง ฯลฯ
- กรองตามประเภทและหมวดหมู่

**2. งวดชำระ (Installments)**
- ผูกกับสัญญา
- บันทึกการชำระแต่ละงวด
- ติดตามยอดชำระแล้ว/คงเหลือ

**3. สรุปการเงิน**
- ดูภาพรวมรายรับ-รายจ่าย
- สรุปตามโครงการ
- ส่งออก CSV`,
    tips: [
      'ถ้าลบงวดชำระไม่ได้ (มีรายการบัญชีเชื่อม) กด "ลบทั้งหมด" ได้',
      'ใช้ปุ่ม "ชำระ" เพื่อบันทึกการจ่ายเงิน',
      'กรองตามประเภท (รายรับ/รายจ่าย) เพื่อความสะดวก'
    ]
  },
  {
    id: 'quotations',
    title: 'ใบเสนอราคา',
    icon: Receipt,
    steps: [
      'ไปที่เมนู "ใบเสนอราคา"',
      'กด "+ สร้างใบเสนอราคา"',
      'เลือกลูกค้าและโครงการ',
      'เพิ่มรายการสินค้า/บริการ',
      'กำหนดราคาและส่วนลด',
      'เปลี่ยนสถานะ: Draft → Sent → Accepted/Rejected'
    ]
  },
  {
    id: 'contracts',
    title: 'สัญญา',
    icon: ShieldCheck,
    steps: [
      'ไปที่เมนู "สัญญา"',
      'กด "+ สร้างสัญญา"',
      'เลือกลูกค้าและโครงการ',
      'กรอกเลขที่สัญญา, วันที่, มูลค่า',
      'อัปโหลดไฟล์สัญญา (ถ้ามี)',
      'ผูกงวดชำระกับสัญญา'
    ]
  },
  {
    id: 'reports',
    title: 'รายงาน',
    icon: BarChart3,
    content: `รายงานแบ่งเป็นหลายหมวด:

**สรุปโครงการ:**
- ตามสถานะ (completed, in_progress, blocked)
- ตามขนาด (≤1MW, >1MW)
- ตามจังหวัด
- ตามขั้นตอน (Pipeline)

**สรุปงาน:**
- ตามผู้รับผิดชอบ
- รายละเอียดงานทั้งหมด
- ผลงานรายบุคคล

**อื่นๆ:**
- ความเสี่ยง (Risk Report)
- ระยะเวลาเฉลี่ยแต่ละขั้นตอน (Lead Time)
- Timeline ทั้งหมด`,
    tips: [
      'ส่งออก Excel: กดปุ่ม "ส่งออก Excel" มุมขวาบน',
      'ส่งออก PDF: กดปุ่ม "ส่งออก PDF"',
      'Excel จะสร้างหลาย Sheet ตามหมวดรายงาน'
    ]
  },
  {
    id: 'organizations',
    title: 'หน่วยงาน',
    icon: Building2,
    steps: [
      'ไปที่เมนู "หน่วยงาน"',
      'กด "+ เพิ่มหน่วยงาน"',
      'กรอกชื่อ, ประเภท (การไฟฟ้า, ผู้รับเหมา ฯลฯ)',
      'กรอกข้อมูลติดต่อ',
      'เพิ่มหน่วยงานในโครงการผ่านหน้ารายละเอียดโครงการ'
    ],
    tips: [
      'อนุมัติ/ปฏิเสธหน่วยงานผ่านหน้ารายละเอียดโครงการ',
      'สถานะ: Pending → Approved/Rejected'
    ]
  },
  {
    id: 'customers',
    title: 'ลูกค้า',
    icon: UserCircle,
    steps: [
      'ไปที่เมนู "ลูกค้า"',
      'กด "+ เพิ่มลูกค้า"',
      'กรอกชื่อ, เบอร์โทร, อีเมล, ที่อยู่',
      'ลูกค้าจะเชื่อมกับโครงการและสัญญา'
    ]
  },
  {
    id: 'network-map',
    title: 'แผนที่โครงข่าย',
    icon: Map,
    content: `แสดงแผนที่ตำแหน่งโครงการทั้งหมด

- สี markers แสดงตามสถานะโครงการ
- คลิกที่ marker เพื่อดูรายละเอียด
- สรุปจำนวนโครงการด้านซ้าย`
  },
  {
    id: 'settings',
    title: 'ตั้งค่า',
    icon: Settings,
    content: `**ข้อมูลบริษัท:**
- ชื่อบริษัท, ที่อยู่, เบอร์โทร
- อัปโหลดโลโก้บริษัท (แสดงใน PDF)

**ตั้งค่าทั่วไป:**
- ภาษา (ไทย/อังกฤษ)
- ธีม (Light)
- รูปแบบวันที่
- เขตเวลา

**จัดการผู้ใช้:**
- เพิ่ม/แก้ไข/ลบผู้ใช้
- กำหนดบทบาท

**ข้อมูลระบบ:**
- ประวัติเวอร์ชัน
- สำรองข้อมูล`
  },
  {
    id: 'customer-portal',
    title: 'แดชบอร์ดลูกค้า (Client)',
    icon: LayoutGrid,
    content: `สำหรับผู้ใช้บทบาท "Client" เข้าดูข้อมูลโครงการของตัวเอง

**สิ่งที่ดูได้:**
- สรุปสถานะโครงการ
- รายการโครงการ
- ใบเสนอราคา
- สัญญา
- เอกสาร`
  },
  {
    id: 'tips',
    title: 'เคล็ดลับการใช้งาน',
    icon: HelpCircle,
    tips: [
      'กด Ctrl+K หรือ Cmd+K เพื่อค้นหาเร็ว',
      'ใช้ Sidebar นำทางระหว่างหน้าต่างๆ',
      'แต่ละหน้ามีปุ่มกรอง/ค้นหาด้านบน',
      'ส่งออกรายงานเป็น Excel/PDF ได้จากหน้ารายงาน',
      'ตรวจสอบการแจ้งเตือนจากไอคอนกระดิ่งมุมขวาบน',
      'เปลี่ยนรหัสผ่านจากหน้าตั้งค่า',
      'Client เข้าดูข้อมูลผ่าน "แดชบอร์ดลูกค้า"'
    ]
  }
];

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = section.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{section.title}</h3>
        </div>
        {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-13 space-y-3">
            {section.content && (
              <div className="whitespace-pre-line text-sm text-slate-600 leading-relaxed">
                {section.content.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className="text-slate-900">{part}</strong> : part
                )}
              </div>
            )}

            {section.steps && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">ขั้นตอน:</p>
                <ol className="space-y-1.5">
                  {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {section.tips && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">เคล็ดลับ:</p>
                <ul className="space-y-1.5">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-amber-500">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [openSections, setOpenSections] = useState(['overview']);

  const toggleSection = (id) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">คู่มือการใช้งาน</h1>
          <p className="text-sm text-slate-500">Solar Dashboard — คู่มือสำหรับผู้ใช้งานทุกบทบาท</p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>ยินดีต้อนรับ!</strong> คู่มือนี้อธิบายวิธีใช้งานฟีเจอร์ทั้งหมดในระบบ
          กดที่หัวข้อเพื่อดูรายละเอียด
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.includes(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
