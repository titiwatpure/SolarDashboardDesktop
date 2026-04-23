export const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  blocked: 'ติดปัญหา',
  completed: 'เสร็จแล้ว',
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export const STEP_LABELS = {
  survey: 'สำรวจ',
  design: 'ออกแบบ',
  erc: 'ERC',
  grid: 'Grid',
  construction: 'ก่อสร้าง',
  testing: 'ทดสอบ',
  cod: 'COD',
};

export const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

export const PROVINCES = [
  'กรุงเทพมหานคร',
  'สมุทรปราการ',
  'นนทบุรี',
  'ปทุมธานี',
  'พระนครศรีอยุธยา',
  'ชลบุรี',
  'ระยอง',
  'จันทบุรี',
  'ตราด',
  'ประจวบคีรีขันธ์',
  'พัทยา',
  'นครนายก',
  'นครราชสีมา',
  'ขอนแก่น',
  'อุดรธานี',
  'เลย',
  'หนองคาย',
  'มหาสารคาม',
  'อำนาจเจริญ',
  'ร้อยเอ็ด',
  'กาฬสินธุ์',
  'สกลนคร',
  'นครพนม',
  'มุกดาหาร',
  'ยโสธร',
  'ศรีสะเกษ',
  'อุบลราชธานี',
  'ชัยภูมิ',
  'หนองบัวลำภู',
  'เชียงใหม่',
  'ลำพูน',
  'ลำปาง',
  'พะเยา',
  'เชียงราย',
  'แม่ฮ่องสอน',
  'นครสวรรค์',
  'พิษณุโลก',
  'เพชรบูรณ์',
  'ตาก',
  'สุโขทัย',
  'พิจิตร',
  'อุตรดิตถ์',
  'กำแพงเพชร',
  'ราชบุรี',
  'กาญจนบุรี',
  'สุพรรณบุรี',
  'ลพบุรี',
  'สิงห์บุรี',
  'เพชรบุรี',
  'ชุมพร',
  'สุราษฎร์ธานี',
  'นครศรีธรรมราช',
  'พังงา',
  'ภูเก็ต',
  'ตรัง',
  'สตูล',
  'สงขลา',
  'สตูล',
  'หาดใหญ่',
  'ปัตตานี',
  'ยะลา',
  'นราธิวาส',
];

export const ORG_TYPES = {
  erc: 'กกพ. (ERC)',
  pea: 'PEA',
  mea: 'MEA',
  tambon: 'อบต.',
  municipal: 'เทศบาล',
  factory: 'กรมโรงงาน',
  industrial: 'นิคมอุตสาหกรรม',
};

export const DOCUMENT_TYPES = {
  sld: 'SLD',
  permit: 'ใบอนุญาต',
  test_report: 'Test Report',
  other: 'อื่นๆ',
};

export const PERMIT_TYPES = {
  exemption: 'แจ้งยกเว้น',
  permit: 'ขอใบอนุญาต',
};

export const determinePermitType = (sizeKva, hasPowerSelling) => {
  if (hasPowerSelling || (sizeKva && sizeKva > 1000)) {
    return 'permit';
  } else if (sizeKva && sizeKva <= 1000 && !hasPowerSelling) {
    return 'exemption';
  }
  return null;
};
