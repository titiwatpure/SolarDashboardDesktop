import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Loader, MapPin, Search, Filter, RefreshCw } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { PROVINCE_COORDS, STATUS_LABELS, STEP_LABELS } from '../utils/constants';

// สีสถานะที่โดดเด่น (Fill + Border)
const STATUS_COLORS = {
  completed: '#10b981',
  in_progress: '#3b82f6',
  waiting: '#f59e0b',
  blocked: '#ef4444',
  rejected: '#f97316',
  not_started: '#94a3b8',
};

const STATUS_BORDER_COLORS = {
  completed: '#059669',
  in_progress: '#2563eb',
  waiting: '#d97706',
  blocked: '#dc2626',
  rejected: '#ea580c',
  not_started: '#64748b',
};

const STATUS_LABELS_TH = {
  completed: 'เสร็จสิ้น',
  in_progress: 'กำลังดำเนินการ',
  waiting: 'รอข้อมูล',
  blocked: 'ติดปัญหา',
  rejected: 'ถูกปฏิเสธ',
  not_started: 'ยังไม่เริ่ม',
};

const REGIONS = {
  'ภาคกลาง': ['กรุงเทพมหานคร', 'สมุทรปราการ', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา', 'นครนายก', 'ลพบุรี', 'สิงห์บุรี', 'ชัยนาท', 'สระบุรี', 'นครปฐม', 'สมุทรสาคร', 'สมุทรสงคราม', 'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ปราจีนบุรี', 'สระแก้ว', 'กาญจนบุรี', 'ราชบุรี', 'สุพรรณบุรี', 'ประจวบคีรีขันธ์'],
  'ภาคตะวันออกเฉียงเหนือ': ['นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'อุบลราชธานี', 'ศรีสะเกษ', 'สุรินทร์', 'บุรีรัมย์', 'ชัยภูมิ', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์', 'สกลนคร', 'นครพนม', 'มุกดาหาร', 'ยโสธร', 'อำนาจเจริญ', 'หนองบัวลำภู', 'หนองคาย', 'บึงกาฬ', 'เลย'],
  'ภาคเหนือ': ['เชียงใหม่', 'เชียงราย', 'ลำพูน', 'ลำปาง', 'พะเยา', 'น่าน', 'แพร่', 'แม่ฮ่องสอน', 'อุตรดิตถ์', 'สุโขทัย', 'พิษณุโลก', 'เพชรบูรณ์', 'พิจิตร', 'กำแพงเพชร', 'นครสวรรค์', 'ตาก', 'อุทัยธานี'],
  'ภาคใต้': ['ชุมพร', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'พังงา', 'ภูเก็ต', 'กระบี่', 'ตรัง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส', 'ระนอง', 'พัทลุง'],
};

const REGION_COLORS = {
  'ภาคกลาง': '#3b82f6',
  'ภาคตะวันออกเฉียงเหนือ': '#10b981',
  'ภาคเหนือ': '#f59e0b',
  'ภาคใต้': '#8b5cf6',
};

function getRegion(province) {
  for (const [region, provinces] of Object.entries(REGIONS)) {
    if (provinces.includes(province)) return region;
  }
  return 'อื่นๆ';
}

export default function NetworkMap() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await projectsAPI.getAll({ limit: 200 });
        setProjects(data.data || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!p.project_name?.toLowerCase().includes(term) && 
            !p.project_code?.toLowerCase().includes(term) &&
            !p.province?.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (selectedRegion !== 'all' && getRegion(p.province) !== selectedRegion) return false;
      return true;
    });
  }, [projects, searchTerm, selectedStatus, selectedRegion]);

  const provinceGroups = useMemo(() => {
    const groups = {};
    filteredProjects.forEach((p) => {
      const prov = p.province;
      if (!prov) return;
      if (!groups[prov]) groups[prov] = [];
      groups[prov].push(p);
    });
    return groups;
  }, [filteredProjects]);

  const regionSummary = useMemo(() => {
    const summary = {};
    Object.keys(REGIONS).forEach((r) => { summary[r] = { total: 0, provinces: 0 }; });
    for (const [prov, projs] of Object.entries(provinceGroups)) {
      const region = getRegion(prov);
      if (!summary[region]) summary[region] = { total: 0, provinces: 0 };
      summary[region].total += projs.length;
      summary[region].provinces += 1;
    }
    return Object.entries(summary).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total);
  }, [provinceGroups]);

  const statusSummary = useMemo(() => {
    const counts = {};
    filteredProjects.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [filteredProjects]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    projectsAPI.getAll({ limit: 200 }).then((data) => {
      setProjects(data.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== Header: Search + Filters + Refresh ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ, รหัส, จังหวัด..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-400 outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">สถานะ:</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white">
                <option value="all">ทั้งหมด ({projects.length})</option>
                {Object.entries(STATUS_LABELS_TH).map(([key, label]) => (
                  <option key={key} value={key}>{label} ({statusSummary[key] || 0})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">ภูมิภาค:</label>
              <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white">
                <option value="all">ทั้งหมด</option>
                {Object.keys(REGIONS).map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <button onClick={handleRefresh}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              <RefreshCw size={14} /> รีเฟรช
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
          <span>แสดง <strong className="text-slate-700">{filteredProjects.length}</strong> จาก {projects.length} โครงการ</span>
          <span>•</span>
          <span>กำลังการผลิตรวม <strong className="text-blue-600">{(filteredProjects.reduce((sum, p) => sum + (p.size_kw || 0), 0) / 1000).toFixed(1)} MW</strong></span>
        </div>
      </div>

      {/* ===== Map + Sidebar ===== */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-14rem)]">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredProjects.map((p) => {
              const lat = p.site_lat ? Number(p.site_lat) : null;
              const lng = p.site_lng ? Number(p.site_lng) : null;
              const hasCoords = lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
              const provinceCoords = PROVINCE_COORDS[p.province];
              const center = hasCoords ? [lat, lng] : provinceCoords ? [provinceCoords.lat, provinceCoords.lng] : null;
              if (!center) return null;
              const status = p.status || 'not_started';
              const color = STATUS_COLORS[status] || '#94a3b8';
              const borderColor = STATUS_BORDER_COLORS[status] || '#64748b';
              return (
                <CircleMarker key={p.id} center={center} radius={8}
                  pathOptions={{ color: borderColor, fillColor: color, fillOpacity: hasCoords ? 0.9 : 0.5, weight: hasCoords ? 2.5 : 1.5 }}>
                  <Tooltip permanent={false} direction="top" offset={[0, -8]}>
                    <div className="text-xs font-medium">{p.project_name}</div>
                    <div className="text-[10px] text-slate-500">{p.province} • {p.size_kw} kW</div>
                  </Tooltip>
                  <Popup>
                    <div className="min-w-[240px]">
                      <h3 className="font-bold text-sm mb-1 text-slate-800 cursor-pointer hover:text-blue-600"
                          onClick={() => navigate(`/projects/${p.id}`)}>
                        <MapPin className="inline w-4 h-4 mr-1" />{p.project_name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{p.province}</p>
                      {hasCoords && <p className="text-[10px] text-slate-400 mb-2">พิกัด: {lat.toFixed(4)}, {lng.toFixed(4)}</p>}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">ขนาด:</span><span className="font-medium text-slate-800">{p.size_kw} kW</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">สถานะ:</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: color }}>{STATUS_LABELS_TH[status] || status}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">ขั้นตอน:</span><span className="text-slate-700">{STEP_LABELS[p.current_step] || '-'}</span></div>
                      </div>
                      <a href={`/projects/${p.id}`} className="mt-3 block text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 bg-blue-50 rounded-lg">ดูรายละเอียด →</a>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">สีสถานะ</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS_TH).map(([status, label]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                    <span className="text-xs text-slate-600">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{statusSummary[status] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">สรุปตามภูมิภาค</h3>
            <div className="space-y-3">
              {regionSummary.map(([region, data]) => (
                <div key={region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REGION_COLORS[region] || '#94a3b8' }} />
                      {region}
                    </span>
                    <span className="font-semibold text-slate-800">{data.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${(data.total / filteredProjects.length) * 100}%`, backgroundColor: REGION_COLORS[region] || '#94a3b8' }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{data.provinces} จังหวัด</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
