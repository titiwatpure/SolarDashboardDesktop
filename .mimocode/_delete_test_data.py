import sqlite3

conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# ลบข้อมูลทดสอบ
tables_to_clean = [
    'knowledge_base',        # ข้อมูลทดสอบทั้งหมด
    'doc_review_checklists', # เช็คลิสต์ทดสอบ
    'doc_submission_packages', # ชุดเอกสารทดสอบ
    'doc_review_projects',   # โครงการตรวจเอกสารทดสอบ
    'document_issues',       # ปัญหาทดสอบ
    'doc_review_timeline',   # ประวัติทดสอบ
    'report_drafts',         # รายงานทดสอบ
    'tasks',                 # งานทดสอบ
]

for table in tables_to_clean:
    try:
        c.execute(f'DELETE FROM {table}')
        count = c.rowcount
        print(f'Deleted {count} records from {table}')
    except Exception as e:
        print(f'Error deleting from {table}: {e}')

# ลบโครงการทดสอบ (ที่มี project_code ขึ้นต้น SOL-)
c.execute("DELETE FROM projects WHERE project_code LIKE 'SOL-%'")
count = c.rowcount
print(f'Deleted {count} test projects')

# ลบ checklists ทดสอบ
c.execute("DELETE FROM doc_review_checklists WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'SOL-%')")
count = c.rowcount
print(f'Deleted {count} test checklists')

conn.commit()
conn.close()
print('Test data deleted successfully!')
