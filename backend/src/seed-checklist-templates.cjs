/**
 * Seed Checklist Templates from ERC (กกพ.) regulations
 * สร้าง template เช็คลิสต์สำหรับเอกสารยื่นขออนุญาต
 */

const { v4: uuidv4 } = require('uuid');

const checklistTemplates = [
  // ============================================================
  // 1. อ.1 ขออนุญาตก่อสร้างอาคาร (กิจการพลังงาน)
  // ============================================================
  {
    id: 'tpl-permit-a1',
    name: 'เช็คลิสต์ อ.1 ขออนุญาตก่อสร้างอาคาร (กิจการพลังงาน)',
    permit_type: 'construction_permit',
    document_type: 'A1',
    agency: 'เทศบาล/อบต.',
    source: 'ERC Checklist (070526)',
    is_template: 1,
    items: [
      { title: 'คำขออนุญาตก่อสร้างอาคาร (แบบ อ.1)', description: 'เอกสารแบบฟอร์มราชการที่กรอกครบถ้วน ลงนามโดยเจ้าของโครงการ', is_required: 1 },
      { title: 'สำเนาบัตรประชาชนเจ้าของโครงการ', description: 'สำเนาที่เซ็นรับรองความถูกต้อง', is_required: 1 },
      { title: 'หนังสือรับรองความเป็นนิติบุคคล (ถ้ามี)', description: 'สำหรับกรณีนิติบุคคล', is_required: 0 },
      { title: 'เอกสารสิทธิ์ที่ดิน (น.ส.3, น.ส.4, ภ.บ.ท.5)', description: 'สำเนาพร้อมหนังสือยินยอมเจ้าของที่ดิน', is_required: 1 },
      { title: 'หนังสือยินยอมเจ้าของที่ดิน', description: 'หนังสือยินยอมให้ก่อสร้างอาคารบนที่ดิน', is_required: 1 },
      { title: 'แบบแปลนก่อสร้าง (มีลายเซ็นวิศวกร)', description: 'แผนผังอาคาร โครงสร้าง ระบบไฟฟ้า ระบบน้ำ ทุกหน้าต้องมีลายเซ็นวิศวกรผู้ออกแบบ', is_required: 1 },
      { title: 'ใบอนุญาตประกอบวิชาชีพวิศวกรรม', description: 'สำเนาใบอนุญาตวิศวกรควบคุมงานก่อสร้าง', is_required: 1 },
      { title: 'รูปถ่ายสถานที่ก่อสร้าง', description: 'ถ่ายมุมกว้าง มองเห็นสภาพพื้นที่จริง อย่างน้อย 4 มุม', is_required: 0 },
      { title: 'รายงานประเมินผลกระทบสิ่งแวดล้อม (EIA)', description: 'ถ้าโครงการเข้าข่ายต้องจัดทำ EIA', is_required: 0 },
      { title: 'เอกสารการชำระค่าธรรมเนียม', description: 'หลักฐานการชำระค่าธรรมเนียมขออนุญาตก่อสร้าง', is_required: 1 },
    ]
  },

  // ============================================================
  // 2. รง.4 แจ้งการประกอบกิจการที่ได้รับการยกเว้น
  // ============================================================
  {
    id: 'tpl-permit-rong4',
    name: 'เช็คลิสต์ รง.4 แจ้งการประกอบกิจการที่ได้รับการยกเว้น',
    permit_type: 'factory_exemption',
    document_type: 'Rong4',
    agency: 'กรมโรงงานอุตสาหกรรม',
    source: 'กรมโรงงานอุตสาหกรรม',
    is_template: 1,
    items: [
      { title: 'แบบแจ้งการประกอบกิจการที่ได้รับการยกเว้น (รง.4)', description: 'เอกสารแบบฟอร์มราชการที่กรอกครบถ้วน', is_required: 1 },
      { title: 'สำเนาหนังสือรับรองบริษัท', description: 'หนังสือรับรองความเป็นนิติบุคคล ออกโดยกรมพัฒนาธุรกิจการค้า', is_required: 1 },
      { title: 'สำเนาบัตรประชาชนกรรมการ', description: 'สำเนาบัตรประชาชนกรรมการผู้มีอำนาจลงนาม', is_required: 1 },
      { title: 'แผนผังโรงงาน', description: 'แผนผังแสดงตำแหน่งเครื่องจักร อาคาร ที่ตั้ง', is_required: 1 },
      { title: 'รายชื่อผู้จัดการโรงงาน', description: 'หนังสือแต่งตั้งผู้จัดการโรงงาน', is_required: 1 },
      { title: 'รายการเครื่องจักร', description: 'รายการเครื่องจักรที่ใช้ในกิจการ พร้อมกำลังมอเตอร์', is_required: 1 },
      { title: 'เอกสารสิทธิ์ที่ดิน', description: 'สำเนาสิทธิ์ที่ตั้งโรงงาน', is_required: 1 },
    ]
  },

  // ============================================================
  // 3. พค.2 ใบอนุญาตให้ผลิตพลังงานควบคุม (สำหรับระบบผลิตไฟฟ้า >= 200 kVA)
  // ============================================================
  {
    id: 'tpl-permit-pck2',
    name: 'เช็คลิสต์ พค.2 ใบอนุญาตให้ผลิตพลังงานควบคุม',
    permit_type: 'controlled_energy',
    document_type: 'PhorKhor2',
    agency: 'กกพ./พพ.',
    source: 'CheckList-พค2 update 240626.pdf',
    is_template: 1,
    items: [
      { title: 'แบบคำขอใบอนุญาตให้ผลิตพลังงานควบคุม (พค.2)', description: 'เอกสารแบบฟอร์มราชการที่กรอกครบถ้วน', is_required: 1 },
      { title: 'สำเนาบัตรประชาชนผู้ยื่นคำขอ', description: 'สำเนาที่เซ็นรับรองความถูกต้อง', is_required: 1 },
      { title: 'หนังสือรับรองความเป็นนิติบุคคล', description: 'ออกโดยกรมพัฒนาธุรกิจการค้า (ไม่เกิน 6 เดือน)', is_required: 1 },
      { title: 'เอกสารสิทธิ์ที่ดิน (น.ส.3, น.ส.4, ภ.บ.ท.5)', description: 'สำเนาพร้อมหนังสือยินยอมเจ้าของที่ดิน', is_required: 1 },
      { title: 'หนังสือยินยอมเจ้าของที่ดิน', description: 'หนังสือยินยอมให้ติดตั้งระบบผลิตไฟฟ้า', is_required: 1 },
      { title: 'แผนผังแสดงที่ตั้งเครื่องกำเนิดไฟฟ้า', description: 'แผนผังแสดงตำแหน่งเครื่องกำเนิดไฟฟ้า ระบบไฟฟ้า พร้อมพิกัด Latitude/Longitude', is_required: 1 },
      { title: 'Single Line Diagram (SLD)', description: 'ผังมิเตอร์ไฟฟ้า พร้อมรายละเอียดอุปกรณ์', is_required: 1 },
      { title: 'รายการเครื่องกำเนิดไฟฟ้า', description: 'รายการเครื่องกำเนิดไฟฟ้าทั้งหมด พร้อมกำลัง (kVA/kW)', is_required: 1 },
      { title: 'รายละเอียดอุปกรณ์ (Inverter/Panel Spec)', description: '_datasheet ของอินเวอร์เตอร์และแผงโซลาร์', is_required: 1 },
      { title: 'ใบอนุญาตประกอบวิชาชีพวิศวกรรม', description: 'สำเนาใบอนุญาตวิศวกรผู้ออกแบบ/ควบคุมงาน', is_required: 1 },
      { title: 'รายงานประเมินผลกระทบสิ่งแวดล้อม (EIA)', description: 'ถ้าโครงการเข้าข่ายต้องจัดทำ EIA', is_required: 0 },
      { title: 'เอกสารการชำระค่าธรรมเนียม', description: 'หลักฐานการชำระค่าธรรมเนียมขอใบอนุญาต', is_required: 1 },
    ]
  },

  // ============================================================
  // 4. COP ประมวลหลักการปฏิบัติสำหรับการประกอบกิจการผลิตไฟฟ้า
  // ============================================================
  {
    id: 'tpl-permit-cop',
    name: 'เช็คลิสต์ COP ประมวลหลักการปฏิบัติ (ฉบับที่2) 2567',
    permit_type: 'cop',
    document_type: 'COP',
    agency: 'กกพ.',
    source: 'หลักการปฏิบัติ สำหรับการประกอบกิจการผลิตไฟฟ้า (ฉบับที่2)2567.pdf',
    is_template: 1,
    items: [
      { title: 'แบบฟอร์มรับรองตนเอง (ที่ตั้งโครงการ)', description: 'เอกสารแนบหมายเลข 4-24', is_required: 1 },
      { title: 'รายงาน COP (ประมวลหลักการปฏิบัติ)', description: 'รายงานแผนการปฏิบัติตาม COP', is_required: 1 },
      { title: 'รายงาน COP Monitor', description: 'รายงานผลการปฏิบัติตาม COP เป็นระยะ', is_required: 1 },
      { title: 'เอกสารแนบท้ายระเบียบฯ หมายเลข 4-24', description: 'เอกสารประกอบตามระเบียบ กกพ.', is_required: 1 },
      { title: 'แผนการบำรุงรักษาอุปกรณ์', description: 'แผน PM ของอุปกรณ์หลัก (Inverter, Panel, Transformer)', is_required: 1 },
      { title: 'บันทึกการตรวจสอบและซ่อมบำรุง', description: 'Log book การตรวจสอบประจำวัน/สัปดาห์/เดือน', is_required: 0 },
    ]
  },

  // ============================================================
  // 5. อนุมัติ กกพ. (ขอรับใบอนุญาตผลิตไฟฟ้า)
  // ============================================================
  {
    id: 'tpl-permit-erc',
    name: 'เช็คลิสต์ ขอรับใบอนุญาตผลิตไฟฟ้า (กกพ.)',
    permit_type: 'erc_license',
    document_type: 'ERC',
    agency: 'กกพ.',
    source: 'พระราชบัญญัติการประกอบกิจการพลังงาน พ.ศ. 2550',
    is_template: 1,
    items: [
      { title: 'แบบคำขอรับใบอนุญาตผลิตไฟฟ้า', description: 'เอกสารแบบฟอร์มราชการ กรอกครบถ้วน', is_required: 1 },
      { title: 'สำเนาหนังสือรับรองบริษัท', description: 'ออกโดยกรมพัฒนาธุรกิจการค้า', is_required: 1 },
      { title: 'สำเนาบัตรประชาชนกรรมการผู้มีอำนาจลงนาม', description: 'เซ็นรับรองความถูกต้อง', is_required: 1 },
      { title: 'สัญญาซื้อขายไฟฟ้า (PPA)', description: 'สัญญากับ กฟผ. หรือ กฟน./กฟภ.', is_required: 1 },
      { title: 'รายงานประเมินผลกระทบสิ่งแวดล้อม (EIA)', description: 'ได้รับความเห็นชอบจาก สผ.', is_required: 1 },
      { title: 'เอกสารสิทธิ์ที่ดิน', description: 'เอกสารยืนยันสิทธิ์ในที่ตั้งโครงการ', is_required: 1 },
      { title: 'รายงาน COP (ประมวลหลักการปฏิบัติ)', description: 'แผนการปฏิบัติตาม COP', is_required: 1 },
      { title: 'แบบแปลนโครงการ', description: 'แผนผังแสดงตำแหน่งอุปกรณ์ ระบบไฟฟ้า สายส่ง', is_required: 1 },
      { title: 'ใบอนุญาตประกอบวิชาชีพวิศวกรรม', description: 'สำเนาใบอนุญาตวิศวกรออกแบบ/ควบคุมงาน', is_required: 1 },
      { title: 'เอกสารการชำระค่าธรรมเนียม', description: 'หลักฐานการชำระค่าธรรมเนียมขอใบอนุญาต', is_required: 1 },
    ]
  },

  // ============================================================
  // 6. SLD ผังระบบไฟฟ้า (ยื่น PEA)
  // ============================================================
  {
    id: 'tpl-permit-sld-pea',
    name: 'เช็คลิสต์ SLD ผังระบบไฟฟ้า (PEA)',
    permit_type: 'grid_connection_pea',
    document_type: 'SLD',
    agency: 'PEA (การไฟฟ้าส่วนภูมิภาค)',
    source: 'คู่มือการขอต่อสาย PEA',
    is_template: 1,
    items: [
      { title: 'Single Line Diagram (SLD)', description: 'แผนผังระบบไฟฟ้า single line ที่มีขนาดอุปกรณ์ระบุครบถ้วน', is_required: 1 },
      { title: 'ใบอนุญาตประกอบวิชาชีพวิศวกร (ออกแบบ)', description: 'สำเนาใบอนุญาตวิศวกรผู้ออกแบบระบบไฟฟ้า', is_required: 1 },
      { title: 'ข้อมูลจำเพาะอุปกรณ์ (Inverter Spec)', description: 'Datasheet ของ Inverter ทุกตัว', is_required: 1 },
      { title: 'ข้อมูลจำเพาะแผงโซลาร์ (Panel Spec)', description: 'Datasheet ของแผงโซลาร์เซลล์', is_required: 1 },
      { title: 'ขนาดมิเตอร์ที่ต้องการ', description: 'ขนาดมิเตอร์ที่ต้องการติดตั้ง (kW/kVA)', is_required: 1 },
      { title: 'เอกสารสิทธิ์ที่ดิน', description: 'สำเนาสิทธิ์ที่ตั้งโครงการ', is_required: 1 },
      { title: 'รูปถ่ายสถานที่ติดตั้ง', description: 'รูปถ่ายตำแหน่งที่จะติดตั้งมิเตอร์', is_required: 0 },
    ]
  },

  // ============================================================
  // 6b. SLD ผังระบบไฟฟ้า (ยื่น MEA)
  // ============================================================
  {
    id: 'tpl-permit-sld-mea',
    name: 'เช็คลิสต์ SLD ผังระบบไฟฟ้า (MEA)',
    permit_type: 'grid_connection_mea',
    document_type: 'SLD',
    agency: 'MEA (การไฟฟ้านครหลวง)',
    source: 'คู่มือการขอต่อสาย MEA',
    is_template: 1,
    items: [
      { title: 'Single Line Diagram (SLD)', description: 'แผนผังระบบไฟฟ้า single line ที่มีขนาดอุปกรณ์ระบุครบถ้วน', is_required: 1 },
      { title: 'ใบอนุญาตประกอบวิชาชีพวิศวกร (ออกแบบ)', description: 'สำเนาใบอนุญาตวิศวกรผู้ออกแบบระบบไฟฟ้า', is_required: 1 },
      { title: 'ข้อมูลจำเพาะอุปกรณ์ (Inverter Spec)', description: 'Datasheet ของ Inverter ทุกตัว', is_required: 1 },
      { title: 'ข้อมูลจำเพาะแผงโซลาร์ (Panel Spec)', description: 'Datasheet ของแผงโซลาร์เซลล์', is_required: 1 },
      { title: 'ขนาดมิเตอร์ที่ต้องการ', description: 'ขนาดมิเตอร์ที่ต้องการติดตั้ง (kW/kVA)', is_required: 1 },
      { title: 'เอกสารสิทธิ์ที่ดิน', description: 'สำเนาสิทธิ์ที่ตั้งโครงการ', is_required: 1 },
      { title: 'รูปถ่ายสถานที่ติดตั้ง', description: 'รูปถ่ายตำแหน่งที่จะติดตั้งมิเตอร์', is_required: 0 },
      { title: 'ใบอนุญาตประกอบกิจการโรงงาน (ถ้ามี)', description: 'สำเนาใบอนุญาต รง.4 หรือ รง.1 (ถ้าเข้าข่าย)', is_required: 0 },
    ]
  },

  // ============================================================
  // 7. ขอต่ออายุใบอนุญาต
  // ============================================================
  {
    id: 'tpl-renewal',
    name: 'เช็คลิสต์ ขอต่ออายุใบอนุญาตประกอบกิจการพลังงาน',
    permit_type: 'renewal',
    document_type: 'RENEWAL',
    agency: 'กกพ.',
    source: 'พระราชบัญญัติการประกอบกิจการพลังงาน พ.ศ. 2550',
    is_template: 1,
    items: [
      { title: 'แบบคำขอต่ออายุใบอนุญาต', description: 'เอกสารแบบฟอร์มราชการ กรอกครบถ้วน', is_required: 1 },
      { title: 'สำเนาใบอนุญาตเดิม', description: 'สำเนาใบอนุญาตที่จะขอต่ออายุ', is_required: 1 },
      { title: 'รายงานผลการดำเนินงาน', description: 'รายงานผลการผลิตไฟฟ้าในรอบปีที่ผ่านมา', is_required: 1 },
      { title: 'รายงาน COP Monitor', description: 'รายงานผลการปฏิบัติตาม COP', is_required: 1 },
      { title: 'เอกสารการชำระค่าธรรมเนียม', description: 'หลักฐานการชำระค่าธรรมเนียมต่ออายุ', is_required: 1 },
    ]
  },
];

/**
 * สร้าง checklist templates ใน database
 */
async function seedChecklistTemplates(pool) {
  console.log('📋 กำลังสร้าง Checklist Templates จาก กกพ....');

  for (const template of checklistTemplates) {
    // ตรวจสอบว่า template มีอยู่แล้วหรือไม่
    const existing = await pool.query(
      'SELECT id FROM document_checklists WHERE id = ?',
      [template.id]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⏭️  ${template.name} - มีอยู่แล้ว ข้าม`);
      continue;
    }

    // สร้าง checklist
    const checklistId = template.id;
    await pool.query(
      `INSERT INTO document_checklists (id, name, permit_type, document_type, agency, is_template, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [checklistId, template.name, template.permit_type, template.document_type, template.agency, template.is_template, null]
    );

    // สร้าง items
    for (let i = 0; i < template.items.length; i++) {
      const item = template.items[i];
      const itemId = uuidv4();
      await pool.query(
        `INSERT INTO checklist_items (id, checklist_id, item_order, title, description, is_required)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, checklistId, i + 1, item.title, item.description, item.is_required ? 1 : 0]
      );
    }

    console.log(`  ✅ ${template.name} (${template.items.length} รายการ)`);
  }

  console.log('✅ สร้าง Checklist Templates เสร็จสิ้น');
}

module.exports = { seedChecklistTemplates, checklistTemplates };
