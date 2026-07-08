/**
 * Seed: Template Checklists
 * สร้าง template เช็คลิสต์ 9 ตัวสำหรับ Doc Review
 */

const sqlite3 = require('sqlite3').verbose();
const pathMod = require('path');
const { v4: uuidv4 } = require('uuid');

const templates = [
  {
    id: 'tpl-permit-cop',
    name: 'เช็คลิสต์ COP ประมวลหลักการปฏิบัติ (ฉบับที่2) 2567',
    permit_type: 'cop', document_type: 'COP', agency: 'กกพ.',
    items: [
      { document_name: 'หนังสือขอขึ้นทะเบียนเป็นผู้ผลิตไฟฟ้า', is_required: 1, sort_order: 1 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 2 },
      { document_name: 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม', is_required: 1, sort_order: 3 },
      { document_name: 'หนังสือมอบอำนาจ (ถ้ามี)', is_required: 0, sort_order: 4 },
      { document_name: 'รายละเอียดโครงการผลิตไฟฟ้า', is_required: 1, sort_order: 5 },
    ]
  },
  {
    id: 'tpl-permit-pck2',
    name: 'เช็คลิสต์ พค.2 ใบอนุญาตให้ผลิตพลังงานควบคุม',
    permit_type: 'controlled_energy', document_type: 'PhorKhor2', agency: 'สำนักงาน กกพ.',
    items: [
      { document_name: 'คำขอรับใบอนุญาต (พค.2)', is_required: 1, sort_order: 1 },
      { document_name: 'รายการประกอบคำขอ', is_required: 1, sort_order: 2 },
      { document_name: 'ผังแสดงตำแหน่งที่ตั้งโครงการ', is_required: 1, sort_order: 3 },
      { document_name: 'แบบแปลนสนาม (SITE PLAN)', is_required: 1, sort_order: 4 },
      { document_name: 'Single Line Diagram (SLD)', is_required: 1, sort_order: 5 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 6 },
      { document_name: 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม', is_required: 1, sort_order: 7 },
    ]
  },
  {
    id: 'tpl-permit-erc',
    name: 'เช็คลิสต์ ขอรับใบอนุญาตผลิตไฟฟ้า (กกพ.)',
    permit_type: 'erc_license', document_type: 'ERC', agency: 'กกพ.',
    items: [
      { document_name: 'คำขอรับใบอนุญาตประกอบกิจการผลิตไฟฟ้า', is_required: 1, sort_order: 1 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 2 },
      { document_name: 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม', is_required: 1, sort_order: 3 },
      { document_name: 'รายละเอียดโครงการผลิตไฟฟ้า', is_required: 1, sort_order: 4 },
      { document_name: 'Single Line Diagram (SLD)', is_required: 1, sort_order: 5 },
      { document_name: 'หนังสือยินยอมของเจ้าของที่ดิน', is_required: 1, sort_order: 6 },
    ]
  },
  {
    id: 'tpl-permit-a1',
    name: 'เช็คลิสต์ อ.1 ขออนุญาตก่อสร้างอาคาร (กิจการพลังงาน)',
    permit_type: 'construction_permit', document_type: 'A1', agency: 'สำนักงาน กกพ.',
    items: [
      { document_name: 'คำขออนุญาตก่อสร้างอาคาร (แบบ อ.1)', is_required: 1, sort_order: 1 },
      { document_name: 'สำเนาโฉนดที่ดิน / นส.4', is_required: 1, sort_order: 2 },
      { document_name: 'แบบแปลนอาคาร (พิมพ์เขียว)', is_required: 1, sort_order: 3 },
      { document_name: 'รายการประกอบแบบแปลน', is_required: 1, sort_order: 4 },
      { document_name: 'หนังสือแสดงความยินยอมของเจ้าของที่ดิน', is_required: 1, sort_order: 5 },
    ]
  },
  {
    id: 'tpl-permit-rong4',
    name: 'เช็คลิสต์ รง.4 แจ้งการประกอบกิจการที่ได้รับการยกเว้น (Solar)',
    permit_type: 'factory_exemption', document_type: 'Rong4', agency: 'กรมโรงงานอุตสาหกรรม / กกพ.',
    items: [
      { document_name: 'แบบแจ้งการประกอบกิจการ (รง.4)', is_required: 1, sort_order: 1 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 2 },
      { document_name: 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม', is_required: 1, sort_order: 3 },
      { document_name: 'ผังแสดงตำแหน่งที่ตั้งโครงการ', is_required: 1, sort_order: 4 },
      { document_name: 'รายละเอียดโครงการ', is_required: 1, sort_order: 5 },
    ]
  },
  {
    id: 'tpl-permit-sld-pea',
    name: 'เช็คลิสต์ SLD ผังระบบไฟฟ้า (PEA)',
    permit_type: 'grid_connection_pea', document_type: 'SLD', agency: 'PEA (การไฟฟ้าส่วนภูมิภาค)',
    items: [
      { document_name: 'แบบขอต่อสาย (PEA)', is_required: 1, sort_order: 1 },
      { document_name: 'Single Line Diagram (SLD)', is_required: 1, sort_order: 2 },
      { document_name: 'ผังแสดงตำแหน่งมิเตอร์', is_required: 1, sort_order: 3 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 4 },
    ]
  },
  {
    id: 'tpl-permit-sld-mea',
    name: 'เช็คลิสต์ SLD ผังระบบไฟฟ้า (MEA)',
    permit_type: 'grid_connection_mea', document_type: 'SLD', agency: 'MEA (การไฟฟ้านครหลวง)',
    items: [
      { document_name: 'แบบขอต่อสาย (MEA)', is_required: 1, sort_order: 1 },
      { document_name: 'Single Line Diagram (SLD)', is_required: 1, sort_order: 2 },
      { document_name: 'ผังแสดงตำแหน่งมิเตอร์', is_required: 1, sort_order: 3 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 4 },
    ]
  },
  {
    id: 'tpl-renewal',
    name: 'เช็คลิสต์ ขอต่ออายุใบอนุญาตประกอบกิจการพลังงาน',
    permit_type: 'renewal', document_type: 'RENEWAL', agency: 'กกพ.',
    items: [
      { document_name: 'คำขอต่ออายุใบอนุญาต', is_required: 1, sort_order: 1 },
      { document_name: 'สำเนาใบอนุญาตเดิม', is_required: 1, sort_order: 2 },
      { document_name: 'รายงานผลการดำเนินงาน', is_required: 1, sort_order: 3 },
      { document_name: 'สำเนาหนังสือรับรองบริษัท', is_required: 1, sort_order: 4 },
    ]
  },
  {
    id: '5129182f-43d3-4d33-a37d-a8bd2ec94e66',
    name: 'เช็คลิสต์ อ.5 ใบรับรองการก่อสร้างอาคาร (กิจการพลังงาน)',
    permit_type: 'construction_certificate', document_type: 'A5', agency: 'สำนักงาน กกพ.',
    items: [
      { document_name: 'คำขอใบรับรองการก่อสร้างอาคาร (แบบ อ.5)', is_required: 1, sort_order: 1 },
      { document_name: 'ใบรับรองความปลอดภัย', is_required: 1, sort_order: 2 },
      { document_name: 'รายงานผลการก่อสร้าง', is_required: 1, sort_order: 3 },
      { document_name: 'รูปถ่ายอาคารที่ก่อสร้างเสร็จ', is_required: 1, sort_order: 4 },
    ]
  }
];

function seedTemplates(dbPath) {
  const resolvedPath = dbPath || process.env.DB_PATH || pathMod.join(__dirname, '..', '..', 'solar_dashboard.db');
  const db = new sqlite3.Database(resolvedPath);

  return new Promise((resolve, reject) => {
    let inserted = 0;
    let skipped = 0;
    let total = 0;

    const checkSql = 'SELECT COUNT(*) as cnt FROM document_checklists WHERE id = ?';
    const insertTpl = 'INSERT OR IGNORE INTO document_checklists (id, name, permit_type, document_type, agency, is_template, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime("now"))';
    const insertItem = 'INSERT OR IGNORE INTO checklist_items (id, checklist_id, title, description, is_required, item_order) VALUES (?, ?, ?, ?, ?, ?)';

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      for (const tpl of templates) {
        db.get(checkSql, [tpl.id], (err, row) => {
          if (row && row.cnt > 0) {
            skipped++;
            checkDone();
            return;
          }

          db.run(insertTpl, [tpl.id, tpl.name, tpl.permit_type, tpl.document_type, tpl.agency], function(err2) {
            if (err2) { console.error('Template error:', err2.message); checkDone(); return; }
            
            let itemsDone = 0;
            for (const item of tpl.items) {
              db.run(insertItem, [
                uuidv4(), tpl.id, item.document_name, item.description || null, item.is_required, item.sort_order
              ], () => {
                itemsDone++;
                if (itemsDone === tpl.items.length) { inserted++; checkDone(); }
              });
            }
          });
        });
      }

      function checkDone() {
        total++;
        if (total === templates.length) {
          db.run('COMMIT', () => {
            console.log(`Templates: ${inserted} inserted, ${skipped} skipped`);
            db.close(resolve);
          });
        }
      }
    });
  });
}

module.exports = { seedTemplates };

if (require.main === module) {
  seedTemplates().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
