import { CheckCircle2, AlertTriangle, FolderKanban, FileCheck2, ArrowRight, XCircle, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../utils/api';

const cardConfig = [
  {
    key: 'total_projects',
    label: 'โครงการทั้งหมด',
    helper: 'โครงการ',
    icon: FolderKanban,
    iconClassName: 'bg-blue-100 text-blue-600',
    linkClassName: 'text-blue-600',
    filter: {}
  },
  {
    key: 'exemption',
    label: 'แจ้งยกเว้น (≤ 1,000 kVA)',
    helper: 'โครงการ',
    icon: FileCheck2,
    iconClassName: 'bg-emerald-100 text-emerald-600',
    linkClassName: 'text-emerald-600',
    filter: { permit_type: 'exemption' }
  },
  {
    key: 'permit',
    label: 'ขอใบอนุญาต (> 1,000 kVA)',
    helper: 'โครงการ',
    icon: AlertTriangle,
    iconClassName: 'bg-amber-100 text-amber-600',
    linkClassName: 'text-amber-600',
    filter: { permit_type: 'permit' }
  },
  {
    key: 'completed',
    label: 'COD แล้ว',
    helper: 'โครงการ',
    icon: CheckCircle2,
    iconClassName: 'bg-green-100 text-green-600',
    linkClassName: 'text-green-600',
    filter: { status: 'completed' }
  },
  {
    key: 'blocked',
    label: 'ติดปัญหา',
    helper: 'โครงการ',
    icon: XCircle,
    iconClassName: 'bg-red-100 text-red-600',
    linkClassName: 'text-red-600',
    filter: { status: 'blocked' }
  },
  {
    key: 'critical_risk',
    label: 'ความเสี่ยงวิกฤต',
    helper: 'โครงการ',
    icon: ShieldAlert,
    iconClassName: 'bg-red-100 text-red-600',
    linkClassName: 'text-red-600',
    filter: { risk_level: 'critical' }
  },
];

// รับ props:
// - refreshKey: เมื่อค่านี้เปลี่ยน (จาก Dashboard) จะดึง KPI ใหม่ทันที
//   ใช้เพื่อ sync ตัวเลขหลังจากอัปเดตสถานะโครงการ
export default function KPICards({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    total_projects: 0, // จำนวนโครงการทั้งหมด
    exemption: 0,      // แจ้งยกเว้น (≤ 1,000 kVA)
    permit: 0,         // ขอใบอนุญาต (> 1,000 kVA)
    completed: 0,      // COD แล้ว
    blocked: 0         // ติดปัญหา
  });

  // โหลด KPI ใหม่ทุกครั้งที่ refreshKey เปลี่ยน
  // (เช่น หลังอัปเดตสถานะโครงการ หรือสร้าง/ลบโครงการ)
  useEffect(() => {
    loadKPIs();
  }, [refreshKey]);

  // ดึงตัวเลข KPI จาก API
  const loadKPIs = async () => {
    try {
      const data = await projectsAPI.getKPIs();
      setKpis(data); // อัปเดตค่า
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cardConfig.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900">
                    {Number(kpis[card.key] || 0)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
              </div>

              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconClassName}`}>
                <Icon size={28} />
              </div>
            </div>

            <button
              onClick={() => navigate('/projects')}
              className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${card.linkClassName}`}
            >
              ดูรายละเอียด
              <ArrowRight size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
