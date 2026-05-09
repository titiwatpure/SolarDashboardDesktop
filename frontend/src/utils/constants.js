// constants.js — ค่าคงที่ใช้ทั่วทั้งแอป

// ชื่อภาษาไทยสำหรับสถานะโครงการ (6 สถานะตาม CLAUDE_PRO)
export const STATUS_LABELS = {
  not_started: 'ยังไม่เริ่ม',
  in_progress: 'กำลังดำเนินการ',
  waiting: 'รอตรวจสอบ',
  blocked: 'ติดปัญหา',
  rejected: 'ถูกปฏิเสธ',
  completed: 'เสร็จแล้ว',
};

// สีของ badge แต่ละสถานะ (Tailwind class)
export const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting: 'bg-purple-100 text-purple-800',
  blocked: 'bg-red-100 text-red-800',
  rejected: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

// ระดับความเสี่ยง
export const RISK_LEVELS = {
  low: { label: 'ต่ำ', color: 'bg-green-100 text-green-800', icon: '🟢' },
  medium: { label: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  high: { label: 'สูง', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  critical: { label: 'วิกฤต', color: 'bg-red-100 text-red-800', icon: '🔴' },
};

// บทบาทผู้ใช้ (4 roles ตาม CLAUDE_PRO)
export const ROLES = {
  admin: 'ผู้ดูแลระบบ',
  engineer: 'วิศวกร',
  staff: 'เจ้าหน้าที่',
  client: 'ลูกค้า',
};

// ชื่อภาษาไทยของขั้นตอน workflow
export const STEP_LABELS = {
  survey: 'สำรวจ',
  design: 'ออกแบบ',
  erc: 'ERC',
  grid: 'Grid',
  construction: 'ก่อสร้าง',
  testing: 'ทดสอบ',
  cod: 'COD',
};

// ลำดับขั้นตอนที่ถูกต้อง
export const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

// รายชื่อจังหวัดในประเทศไทย
export const PROVINCES = [
  'กรุงเทพมหานคร', 'สมุทรปราการ', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา',
  'นครนายก', 'ลพบุรี', 'สิงห์บุรี', 'ชัยนาท', 'สระบุรี', 'นครปฐม', 'สมุทรสาคร', 'สมุทรสงคราม',
  'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ปราจีนบุรี', 'สระแก้ว',
  'นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'อุบลราชธานี', 'ศรีสะเกษ', 'สุรินทร์', 'บุรีรัมย์',
  'ชัยภูมิ', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์', 'สกลนคร', 'นครพนม', 'มุกดาหาร',
  'ยโสธร', 'อำนาจเจริญ', 'หนองบัวลำภู', 'หนองคาย', 'บึงกาฬ', 'เลย',
  'เชียงใหม่', 'เชียงราย', 'ลำพูน', 'ลำปาง', 'พะเยา', 'น่าน', 'แพร่', 'แม่ฮ่องสอน',
  'อุตรดิตถ์', 'สุโขทัย', 'พิษณุโลก', 'เพชรบูรณ์', 'พิจิตร', 'กำแพงเพชร', 'นครสวรรค์', 'ตาก', 'อุทัยธานี',
  'กาญจนบุรี', 'ราชบุรี', 'สุพรรณบุรี', 'ประจวบคีรีขันธ์', 'เพชรบูรณ์',
  'ชุมพร', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'พังงา', 'ภูเก็ต', 'กระบี่', 'ตรัง', 'สตูล',
  'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส', 'ระนอง', 'พัทลุง',
];

// ประเภทหน่วยงาน
export const ORG_TYPES = {
  erc: 'กกพ. (ERC)',
  pea: 'PEA',
  mea: 'MEA',
  tambon: 'อบต.',
  municipal: 'เทศบาล',
  factory: 'กรมโรงงาน',
  industrial: 'นิคมอุตสาหกรรม',
};

// ประเภทเอกสาร
export const DOCUMENT_TYPES = {
  sld: 'SLD',
  permit: 'ใบอนุญาต',
  test_report: 'Test Report',
  other: 'อื่นๆ',
};

// ประเภทใบอนุญาต
export const PERMIT_TYPES = {
  exemption: 'แจ้งยกเว้น',
  permit: 'ขอใบอนุญาต',
};

// สถานะ checkpoint
export const CHECKPOINT_STATUSES = {
  pending: { label: 'รอดำเนินการ', color: 'bg-gray-100 text-gray-800' },
  passed: { label: 'ผ่าน', color: 'bg-green-100 text-green-800' },
  failed: { label: 'ไม่ผ่าน', color: 'bg-red-100 text-red-800' },
  skipped: { label: 'ข้าม', color: 'bg-yellow-100 text-yellow-800' },
};

// สถานะการอนุมัติหน่วยงาน
export const APPROVAL_STATUSES = {
  pending: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-800' },
};

// Toast notification types
export const TOAST_TYPES = {
  success: { bg: 'bg-green-500', icon: '✓' },
  error: { bg: 'bg-red-500', icon: '✕' },
  warning: { bg: 'bg-yellow-500', icon: '⚠' },
  info: { bg: 'bg-blue-500', icon: 'ℹ' },
};
