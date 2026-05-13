// constants.js — ค่าคงที่ใช้ทั่วทั้งแอป

// ชื่อภาษาไทยสำหรับสถานะโครงการ (6 สถานะตาม CLAUDE_PRO)
export const STATUS_LABELS = {
  not_started: 'ยังไม่เริ่ม',
  in_progress: 'กำลังดำเนินการ',
  waiting: 'รอตรวจสอบ',
  blocked: 'ติดปัญหา',
  rejected: 'ถูกปฏิเสธ',
  completed: 'เสร็จแล้ว',
  // Checkpoint timeline statuses
  checkpoint_created: 'สร้างจุดตรวจสอบ',
  checkpoint_passed: 'จุดตรวจสอบผ่าน',
  checkpoint_failed: 'จุดตรวจสอบไม่ผ่าน',
  checkpoint_skipped: 'ข้ามจุดตรวจสอบ',
};

// สีของ badge แต่ละสถานะ (Tailwind class)
export const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting: 'bg-purple-100 text-purple-800',
  blocked: 'bg-red-100 text-red-800',
  rejected: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  // Checkpoint timeline statuses
  checkpoint_created: 'bg-cyan-100 text-cyan-800',
  checkpoint_passed: 'bg-emerald-100 text-emerald-800',
  checkpoint_failed: 'bg-rose-100 text-rose-800',
  checkpoint_skipped: 'bg-amber-100 text-amber-800',
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

// พิกัดศูนย์กลางจังหวัด (lat, lng) สำหรับแสดงบนแผนที่
export const PROVINCE_COORDS = {
  'กรุงเทพมหานคร': { lat: 13.7563, lng: 100.5018 },
  'สมุทรปราการ': { lat: 13.5991, lng: 100.5998 },
  'นนทบุรี': { lat: 13.8622, lng: 100.5144 },
  'ปทุมธานี': { lat: 14.0208, lng: 100.5250 },
  'พระนครศรีอยุธยา': { lat: 14.3692, lng: 100.5877 },
  'นครนายก': { lat: 14.2069, lng: 101.2130 },
  'ลพบุรี': { lat: 14.7995, lng: 100.6534 },
  'สิงห์บุรี': { lat: 14.8912, lng: 100.3967 },
  'ชัยนาท': { lat: 15.1851, lng: 100.1251 },
  'สระบุรี': { lat: 14.5289, lng: 100.9102 },
  'นครปฐม': { lat: 13.8199, lng: 100.0622 },
  'สมุทรสาคร': { lat: 13.5377, lng: 100.2741 },
  'สมุทรสงคราม': { lat: 13.4096, lng: 99.9971 },
  'ชลบุรี': { lat: 13.3611, lng: 100.9847 },
  'ระยอง': { lat: 12.6814, lng: 101.2816 },
  'จันทบุรี': { lat: 12.6109, lng: 102.1030 },
  'ตราด': { lat: 12.2428, lng: 102.5170 },
  'ปราจีนบุรี': { lat: 14.0531, lng: 101.3731 },
  'สระแก้ว': { lat: 13.8240, lng: 102.0640 },
  'นครราชสีมา': { lat: 14.9799, lng: 102.0978 },
  'ขอนแก่น': { lat: 16.4322, lng: 102.8236 },
  'อุดรธานี': { lat: 17.4157, lng: 102.7859 },
  'อุบลราชธานี': { lat: 15.2448, lng: 104.8473 },
  'ศรีสะเกษ': { lat: 15.1186, lng: 104.3240 },
  'สุรินทร์': { lat: 14.8829, lng: 103.4937 },
  'บุรีรัมย์': { lat: 14.9930, lng: 103.1029 },
  'ชัยภูมิ': { lat: 15.8068, lng: 102.0316 },
  'ร้อยเอ็ด': { lat: 16.0538, lng: 103.6520 },
  'มหาสารคาม': { lat: 16.1850, lng: 103.3026 },
  'กาฬสินธุ์': { lat: 16.4330, lng: 103.5066 },
  'สกลนคร': { lat: 17.1546, lng: 104.1348 },
  'นครพนม': { lat: 17.3920, lng: 104.7695 },
  'มุกดาหาร': { lat: 16.5419, lng: 104.7219 },
  'ยโสธร': { lat: 15.7921, lng: 104.1453 },
  'อำนาจเจริญ': { lat: 15.8647, lng: 104.6290 },
  'หนองบัวลำภู': { lat: 17.2218, lng: 102.4243 },
  'หนองคาย': { lat: 17.8783, lng: 102.7413 },
  'บึงกาฬ': { lat: 18.3609, lng: 103.6473 },
  'เลย': { lat: 17.4860, lng: 101.7223 },
  'เชียงใหม่': { lat: 18.7883, lng: 98.9853 },
  'เชียงราย': { lat: 19.9072, lng: 99.8306 },
  'ลำพูน': { lat: 18.5745, lng: 99.0085 },
  'ลำปาง': { lat: 18.2888, lng: 99.4909 },
  'พะเยา': { lat: 19.1706, lng: 99.9004 },
  'น่าน': { lat: 18.7869, lng: 100.7769 },
  'แพร่': { lat: 18.1446, lng: 100.1410 },
  'แม่ฮ่องสอน': { lat: 19.3020, lng: 97.9654 },
  'อุตรดิตถ์': { lat: 17.6200, lng: 100.0993 },
  'สุโขทัย': { lat: 17.0070, lng: 99.8231 },
  'พิษณุโลก': { lat: 16.8210, lng: 100.2659 },
  'เพชรบูรณ์': { lat: 16.4188, lng: 101.1551 },
  'พิจิตร': { lat: 16.4429, lng: 100.3488 },
  'กำแพงเพชร': { lat: 16.4828, lng: 99.5227 },
  'นครสวรรค์': { lat: 15.6987, lng: 100.1196 },
  'ตาก': { lat: 16.8840, lng: 99.1266 },
  'อุทัยธานี': { lat: 15.3835, lng: 100.0245 },
  'กาญจนบุรี': { lat: 14.0228, lng: 99.5329 },
  'ราชบุรี': { lat: 13.5367, lng: 99.8175 },
  'สุพรรณบุรี': { lat: 14.4745, lng: 100.1178 },
  'ประจวบคีรีขันธ์': { lat: 11.8070, lng: 99.7917 },
  'ชุมพร': { lat: 10.4930, lng: 99.1800 },
  'สุราษฎร์ธานี': { lat: 9.1340, lng: 99.3334 },
  'นครศรีธรรมราช': { lat: 8.4328, lng: 99.9631 },
  'พังงา': { lat: 8.4513, lng: 98.5246 },
  'ภูเก็ต': { lat: 7.8804, lng: 98.3923 },
  'กระบี่': { lat: 8.0863, lng: 98.9063 },
  'ตรัง': { lat: 7.5563, lng: 99.6114 },
  'สตูล': { lat: 6.6238, lng: 100.0674 },
  'สงขลา': { lat: 7.1898, lng: 100.5954 },
  'ปัตตานี': { lat: 6.8688, lng: 101.2505 },
  'ยะลา': { lat: 6.5410, lng: 101.2813 },
  'นราธิวาส': { lat: 6.4255, lng: 101.8255 },
  'ระนอง': { lat: 9.9529, lng: 98.6086 },
  'พัทลุง': { lat: 7.6167, lng: 100.0740 },
};

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

// ระดับความสำคัญของ Task
export const PRIORITY_LABELS = {
  urgent: 'เร่งด่วน',
  high: 'สูง',
  medium: 'ปานกลาง',
  low: 'ต่ำ',
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
