import sqlite3
import uuid

conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# Sample data for Knowledge Base
samples = [
    # กฎหมาย/ใบอนุญาต
    {
        'folder': 'กฎหมาย',
        'topic': 'ERC (ใบอนุญาตผลิตไฟฟ้า)',
        'content': 'ใบอนุญาตให้ผลิตพลังงานไฟฟ้า (ERC) เป็นใบอนุญาตจากคณะกรรมการกำกับกิจการพลังงาน (กกพ.) สำหรับโรงไฟฟ้าที่มีกำลังผลิตตั้งแต่ 10 MW ขึ้นไป ใช้เวลาพิจารณาประมาณ 120 วัน',
        'keywords': 'ERC,ใบอนุญาต,พลังงาน,กกพ.,ผลิตไฟฟ้า',
        'category': 'legal'
    },
    {
        'folder': 'กฎหมาย',
        'topic': 'พค.2 (ใบอนุญาตก่อสร้าง)',
        'content': 'ใบอนุญาตก่อสร้างสิ่งก่อสร้าง (พค.2) ออกโดยเทศบาลหรือ อบต. ใช้สำหรับการก่อสร้างอาคารหรือสิ่งก่อสร้างที่มีมูลค่าเกิน 1 ล้านบาท',
        'keywords': 'พค.2,ใบอนุญาตก่อสร้าง,เทศบาล,อบต.',
        'category': 'legal'
    },
    {
        'folder': 'กฎหมาย',
        'topic': 'SLD (Single Line Diagram)',
        'content': 'แผนผังสายไฟฟ้าเดี่ยว แสดงการเชื่อมต่อระบบไฟฟ้าของโครงการ Solar ต้องยื่นให้ PEA/MEA พิจารณาก่อนต่อสาย',
        'keywords': 'SLD,แผนผัง,สายไฟ,PEA,MEA',
        'category': 'legal'
    },
    
    # ขั้นตอนการทำงาน
    {
        'folder': 'ขั้นตอน',
        'topic': 'ขั้นตอนการยื่น ERC',
        'content': '1. ออกแบบระบบ 2. จัดทำเอกสาร 3. ยื่น กกพ. 4. รอผลอนุมัติ (120 วัน) 5. ได้รับใบอนุญาต',
        'keywords': 'ERC,ขั้นตอน,ยื่น,กกพ.',
        'category': 'procedure'
    },
    {
        'folder': 'ขั้นตอน',
        'topic': 'ขั้นตอนการต่อสาย PEA/MEA',
        'content': '1. จัดทำ SLD 2. ยื่นขอต่อสาย 3. รอ PEA/MEA ตรวจสอบ 4. ได้รับอนุมัติ 5. ติดตั้งมิเตอร์',
        'keywords': 'PEA,MEA,ต่อสาย,ขั้นตอน',
        'category': 'procedure'
    },
    
    # เอกสาร
    {
        'folder': 'เอกสาร',
        'topic': 'เอกสารที่ต้องเตรียมสำหรับ ERC',
        'content': '1. แบบคำขอ 2. สำเนาทะเบียนบ้าน 3. สำเนาบัตรประชาชน 4. แผนผังที่ดิน 5. SLD 6. แบบแปลน 7. ใบอนุญาตก่อสร้าง',
        'keywords': 'ERC,เอกสาร,เตรียม,ยื่น',
        'category': 'template'
    },
    {
        'folder': 'เอกสาร',
        'topic': 'เอกสารที่ต้องเตรียมสำหรับ PEA/MEA',
        'content': '1. แบบคำขอต่อสาย 2. SLD 3. ใบอนุญาตก่อสร้าง 4. สำเนาทะเบียนบ้าน 5. สำเนาบัตรประชาชน',
        'keywords': 'PEA,MEA,เอกสาร,เตรียม',
        'category': 'template'
    },
    
    # คำถามที่พบบ่อย
    {
        'folder': 'FAQ',
        'topic': 'ใช้เวลานานแค่ไหนถึงจะ COD ได้?',
        'content': 'โดยเฉลี่ยใช้เวลา 6-12 เดือน ขึ้นอยู่กับขนาดโครงการและขั้นตอนการอนุมัติ',
        'keywords': 'COD,เวลา,ระยะเวลา,กี่เดือน',
        'category': 'faq'
    },
    {
        'folder': 'FAQ',
        'topic': 'โครงการขนาดเล็กต้องขอใบอนุญาตไหม?',
        'content': 'โครงการขนาดเล็กกว่า 1,000 kVA แจ้งยกเว้น ไม่ต้องขอใบอนุญาต แต่ต้องยื่นเอกสารให้ กกพ. ทราบ',
        'keywords': 'ขนาดเล็ก,ยกเว้น,ใบอนุญาต,kVA',
        'category': 'faq'
    },
]

# Insert sample data
for item in samples:
    id = str(uuid.uuid4())
    c.execute(
        'INSERT OR IGNORE INTO knowledge_base (id, topic, content, keywords, category, folder, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, item['topic'], item['content'], item['keywords'], item['category'], item['folder'], 'system']
    )

conn.commit()
conn.close()
print(f'Created {len(samples)} sample Knowledge Base entries')
