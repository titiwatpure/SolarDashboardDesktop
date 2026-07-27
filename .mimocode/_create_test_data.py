import sqlite3
import uuid
from datetime import datetime

DB = r'E:\Dashboard\backend\solar_dashboard.db'
conn = sqlite3.connect(DB)
c = conn.cursor()

def uid():
    return str(uuid.uuid4())

now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# 1. สร้างโครงการทดสอบ 2 โครงการ
projects = [
    (uid(), 'SOL-TEST-001', 'โครงการทดสอบ 1 - บ้าน ABC', 'พค.2', 'internal_review', now),
    (uid(), 'SOL-TEST-002', 'โครงการทดสอบ 2 - บ้าน XYZ', 'อ.1', 'internal_review', now),
]
for p in projects:
    c.execute("INSERT OR IGNORE INTO doc_review_projects (id, project_code, project_name, permit_type, project_status, created_at) VALUES (?,?,?,?,?,?)", p)
    print(f"+ Project: {p[1]} - {p[2]}")

# 2. สร้าง packages
packages = []
for proj in projects:
    for permit in ['พค.2', 'อ.1', 'รง.4']:
        pkg_id = uid()
        packages.append((pkg_id, proj[0], f'ชุดเอกสาร {permit}', permit, 'internal_review', now))
        c.execute("INSERT OR IGNORE INTO doc_submission_packages (id, project_id, package_name, permit_type, package_status, created_at) VALUES (?,?,?,?,?,?)", packages[-1])
print(f"+ Packages: {len(packages)}")

# 3. สร้าง checklists สำหรับแต่ละ package
checklists_data = []
for pkg in packages:
    proj_id = pkg[1]
    for i, doc_name in enumerate(['แบบคำขอ', 'เอกสารประกอบ', 'แผนผัง'], 1):
        # สุ่มสถานะ: 1=customer_revision, 2=passed, 3=pending
        if i == 1:
            status = 'customer_revision'
        elif i == 2:
            status = 'passed'
        else:
            status = 'pending'
        cl_id = uid()
        checklists_data.append((cl_id, proj_id, doc_name, f'รายละเอียด {doc_name}', 1, status, pkg[0], now))
        c.execute("""INSERT OR IGNORE INTO doc_review_checklists
                     (id, project_id, document_name, description, is_required, status, package_id, updated_at)
                     VALUES (?,?,?,?,?,?,?,?)""", checklists_data[-1])
print(f"+ Checklists: {len(checklists_data)}")

# 4. สร้าง open issues
issues_data = []
for cl in checklists_data[:3]:
    # Internal issue
    issue1 = (uid(), cl[0], cl[6], 'internal', f'ปัญหาจาก {cl[2]} - ต้องแก้ไข', 'ส่งเอกสารใหม่', 'open', 1, None, now)
    c.execute("""INSERT OR IGNORE INTO document_issues
                 (id, checklist_item_id, package_id, issue_source, description, required_action, status, revision_round, created_by, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?)""", issue1)
    issues_data.append(issue1)
    # Agency issue
    issue2 = (uid(), cl[0], cl[6], 'agency', f'หน่วยงานต้องการแก้ไข {cl[2]}', 'แก้ไขแล้วยื่นใหม่', 'open', 1, None, now)
    c.execute("""INSERT OR IGNORE INTO document_issues
                 (id, checklist_item_id, package_id, issue_source, description, required_action, status, revision_round, created_by, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?)""", issue2)
    issues_data.append(issue2)
print(f"+ Issues: {len(issues_data)}")

conn.commit()
conn.close()
print("\n✅ สร้างข้อมูลทดสอบเสร็จ!")
print("   - 2 โครงการ")
print(f"   - {len(packages)} packages")
print(f"   - {len(checklists_data)} checklists (customer_revision/passed/pending)")
print(f"   - {len(issues_data)} open issues")
