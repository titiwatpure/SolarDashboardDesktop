-- Sample data for testing (SQLite compatible)
-- รัน init-db.cjs ก่อน แล้วค่อย run file นี้

-- Insert demo organizations (ใช้ SQLite randomblob แทน gen_random_uuid())
INSERT OR IGNORE INTO organizations (id, org_name, org_type, status) VALUES
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'สำนักกำกับกิจการพลังงาน (กกพ.)', 'erc', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'บริษัท การไฟฟ้าส่วนภูมิภาค (PEA)', 'pea', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'บริษัท การไฟฟ้านครหลวง (MEA)', 'mea', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'องค์การบริหารส่วนตำบล (อบต.)', 'tambon', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'เทศบาลเมือง', 'municipal', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'กรมโรงงาน', 'factory', 'active'),
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'นิคมอุตสาหกรรม', 'industrial', 'active');

-- Note: To add sample projects, use the API or manually insert
-- Example of inserting a project:
/*
INSERT INTO projects (
  id, project_name, project_code, size_kw, size_kva, province,
  status, current_step, description, has_power_selling, requires_permit,
  permit_type, start_date
) VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'โครงการติดตั้ง Solar Rooftop บริษัท ABC',
  'PROJ-001',
  100,
  110,
  'กรุงเทพมหานคร',
  'in_progress',
  'design',
  'โครงการติดตั้งแผงโซลาร์บนหลังคาของอาคาร',
  0,
  1,
  'exemption',
  datetime('now')
);
*/
