-- Sample data for testing
-- เพิ่มข้อมูลผู้ใช้ตัวอย่าง (ทำก่อนการ run file นี้)

-- Insert demo organizations
INSERT INTO organizations (id, org_name, org_type, status) VALUES
(gen_random_uuid(), 'สำนักกลั่นกำลังไฟฟ้า (กกพ.)', 'erc', 'active'),
(gen_random_uuid(), 'บริษัท การไฟฟ้าส่วนภูมิภาค (PEA)', 'pea', 'active'),
(gen_random_uuid(), 'บริษัท การไฟฟ้านครหลวง (MEA)', 'mea', 'active'),
(gen_random_uuid(), 'องค์การบริหารส่วนตำบล (อบต.)', 'tambon', 'active'),
(gen_random_uuid(), 'เทศบาลเมือง', 'municipal', 'active'),
(gen_random_uuid(), 'กรมโรงงาน', 'factory', 'active'),
(gen_random_uuid(), 'นิคมอุตสาหกรรม', 'industrial', 'active')
ON CONFLICT (org_name) DO NOTHING;

-- Note: To add sample projects, use the API or manually insert
-- Example of inserting a project:
/*
INSERT INTO projects (
  id, project_name, project_code, size_kw, size_kva, province,
  status, current_step, description, has_power_selling, requires_permit,
  permit_type, start_date
) VALUES (
  gen_random_uuid(),
  'โครงการติดตั้ง Solar Rooftop บริษัท ABC',
  'PROJ-001',
  100,
  110,
  'กรุงเทพมหานคร',
  'in_progress',
  'design',
  'โครงการติดตั้งแผงโซลาร์บนหลังคาของอาคาร',
  false,
  true,
  'exemption',
  NOW()
);
*/
