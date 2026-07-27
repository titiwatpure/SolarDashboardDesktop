import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
import { STEP_LABELS } from '../utils/constants';

const OverdueProjects = memo(function OverdueProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const result = await projectsAPI.getAll({ limit: 100 });
      const list = Array.isArray(result?.data) ? result.data : [];

      // หาโครงการที่ค้างเกิน 14 วัน (updated_at ล่าสุดเก่ากว่า 14 วัน และ status ไม่ใช่ completed)
      const now = Date.now();
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;

      const overdue = list
        .filter(p => p.status !== 'completed' && p.status !== 'not_started')
        .map(p => {
          const updated = new Date(p.updated_at || p.created_at).getTime();
          const daysOverdue = Math.floor((now - updated) / (24 * 60 * 60 * 1000));
          return { ...p, daysOverdue };
        })
        .filter(p => p.daysOverdue >= 14)
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5);

      setProjects(overdue);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">โครงการเกินกำหนด</h2>
          <p className="text-sm text-slate-500">ค้างเกิน 14 วัน</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse"></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-lg">✅</p>
          <p className="mt-2 text-sm">ไม่มีโครงการเกินกำหนด</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const isCritical = p.daysOverdue >= 30;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl p-3 cursor-pointer transition hover:shadow-sm ${
                  isCritical ? 'bg-red-50' : 'bg-amber-50'
                }`}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div>
                  <p className="font-semibold text-slate-800">{p.project_code}</p>
                  <p className="text-xs text-slate-500">
                    {p.project_name?.substring(0, 30)} — ค้างที่ {STEP_LABELS[p.current_step] || p.current_step}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {p.daysOverdue} วัน
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});

export default OverdueProjects;
