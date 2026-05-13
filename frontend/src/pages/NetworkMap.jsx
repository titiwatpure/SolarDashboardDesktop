import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Loader, MapPin } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { PROVINCE_COORDS, STATUS_LABELS, STEP_LABELS } from '../utils/constants';

const STATUS_COLORS = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  waiting: '#a855f7',
  blocked: '#ef4444',
  rejected: '#f97316',
  not_started: '#94a3b8',
};

const REGIONS = {
  'ภาคกลาง': ['กรุงเทพมหานคร', 'สมุทรปราการ', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา', 'นครนายก', 'ลพบุรี', 'สิงห์บุรี', 'ชัยนาท', 'สระบุรี', 'นครปฐม', 'สมุทรสาคร', 'สมุทรสงคราม', 'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ปราจีนบุรี', 'สระแก้ว', 'กาญจนบุรี', 'ราชบุรี', 'สุพรรณบุรี', 'ประจวบคีรีขันธ์'],
  'ภาคตะวันออกเฉียงเหนือ': ['นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'อุบลราชธานี', 'ศรีสะเกษ', 'สุรินทร์', 'บุรีรัมย์', 'ชัยภูมิ', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์', 'สกลนคร', 'นครพนม', 'มุกดาหาร', 'ยโสธร', 'อำนาจเจริญ', 'หนองบัวลำภู', 'หนองคาย', 'บึงกาฬ', 'เลย'],
  'ภาคเหนือ': ['เชียงใหม่', 'เชียงราย', 'ลำพูน', 'ลำปาง', 'พะเยา', 'น่าน', 'แพร่', 'แม่ฮ่องสอน', 'อุตรดิตถ์', 'สุโขทัย', 'พิษณุโลก', 'เพชรบูรณ์', 'พิจิตร', 'กำแพงเพชร', 'นครสวรรค์', 'ตาก', 'อุทัยธานี'],
  'ภาคใต้': ['ชุมพร', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'พังงา', 'ภูเก็ต', 'กระบี่', 'ตรัง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส', 'ระนอง', 'พัทลุง'],
};

function getRegion(province) {
  for (const [region, provinces] of Object.entries(REGIONS)) {
    if (provinces.includes(province)) return region;
  }
  return 'อื่นๆ';
}

function getDominantColor(projects) {
  const counts = {};
  projects.forEach((p) => {
    const s = p.status || 'not_started';
    counts[s] = (counts[s] || 0) + 1;
  });
  let max = 0;
  let dominant = 'not_started';
  for (const [status, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = status;
    }
  }
  return STATUS_COLORS[dominant] || '#94a3b8';
}

export default function NetworkMap() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await projectsAPI.getAll({ limit: 1000 });
        setProjects(data.data || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const provinceGroups = useMemo(() => {
    const groups = {};
    projects.forEach((p) => {
      const prov = p.province;
      if (!prov) return;
      if (!groups[prov]) groups[prov] = [];
      groups[prov].push(p);
    });
    return groups;
  }, [projects]);

  const regionSummary = useMemo(() => {
    const summary = {};
    Object.keys(REGIONS).forEach((r) => {
      summary[r] = { total: 0, provinces: 0 };
    });
    for (const [prov, projs] of Object.entries(provinceGroups)) {
      const region = getRegion(prov);
      if (!summary[region]) summary[region] = { total: 0, provinces: 0 };
      summary[region].total += projs.length;
      summary[region].provinces += 1;
    }
    return Object.entries(summary)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [provinceGroups]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(provinceGroups).map((p) => p.length));
  }, [provinceGroups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <MapContainer
          center={[13.75, 100.5]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {Object.entries(provinceGroups).map(([province, projs]) => {
            const coords = PROVINCE_COORDS[province];
            if (!coords) return null;
            const radius = 6 + (projs.length / maxCount) * 20;
            return (
              <CircleMarker
                key={province}
                center={[coords.lat, coords.lng]}
                radius={radius}
                pathOptions={{
                  color: getDominantColor(projs),
                  fillColor: getDominantColor(projs),
                  fillOpacity: 0.6,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="min-w-[220px]">
                    <h3 className="font-bold text-sm mb-2 text-slate-800">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      {province} ({projs.length} โครงการ)
                    </h3>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {projs.map((p) => (
                        <li
                          key={p.id}
                          className="text-xs cursor-pointer hover:bg-slate-100 p-1 rounded flex justify-between items-center"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          <span className="truncate mr-2">{p.project_name}</span>
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: STATUS_COLORS[p.status] || '#94a3b8' }}
                          >
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Sidebar Summary */}
      <div className="lg:w-72 shrink-0 space-y-4">
        {/* Total */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-1">โครงการทั้งหมด</h3>
          <p className="text-3xl font-bold text-slate-800">{projects.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            ใน {Object.keys(provinceGroups).length} จังหวัด
          </p>
        </div>

        {/* Region Summary */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">สรุปตามภูมิภาค</h3>
          <div className="space-y-3">
            {regionSummary.map(([region, data]) => (
              <div key={region}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{region}</span>
                  <span className="font-semibold text-slate-800">{data.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(data.total / projects.length) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{data.provinces} จังหวัด</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">สีสถานะ</h3>
          <div className="space-y-1.5">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-600">{STATUS_LABELS[status] || status}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            * ขนาดจุด = จำนวนโครงการ
          </p>
        </div>
      </div>
    </div>
  );
}
