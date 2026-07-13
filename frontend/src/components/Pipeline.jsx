import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useEffect, useMemo, useState, memo } from 'react';
import { STEP_LABELS, STEP_ORDER, STATUS_LABELS } from '../utils/constants';
import { reportsAPI } from '../utils/api';

const STATUS_COLORS = {
  completed: '#34c759',
  in_progress: '#3b82f6',
  not_started: '#94a3b8',
  waiting: '#a855f7',
  blocked: '#ef4444',
  rejected: '#f97316',
};

const piePalette = ['#34c759', '#3b82f6', '#94a3b8', '#a855f7', '#ef4444', '#f97316'];

// รับ props:
// - refreshKey: เมื่อค่าเปลี่ยน (จาก Dashboard) จะดึงข้อมูล Pipeline ใหม่ทันที
const Pipeline = memo(function Pipeline({ refreshKey = 0 }) {
  const [stepStats, setStepStats] = useState({});
  const [statusSummary, setStatusSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลดใหม่ทุกครั้งที่ refreshKey เปลี่ยน
  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stepStatusResponse, statusResponse] = await Promise.all([
        reportsAPI.getSummaryByStepStatus(),
        reportsAPI.getSummaryByStatus()
      ]);

      // Handle response ที่อาจเป็น array ตรงๆ หรือถูก wrap ใน { data: [...] }
      const stepStatusData = Array.isArray(stepStatusResponse)
        ? stepStatusResponse
        : (stepStatusResponse?.data || []);
      const statusData = Array.isArray(statusResponse)
        ? statusResponse
        : (statusResponse?.data || []);

      // สร้าง stats object จาก API response
      const stats = {};
      STEP_ORDER.forEach((step) => {
        stats[step] = {
          count: 0,
          statuses: { completed: 0, in_progress: 0, not_started: 0, waiting: 0, blocked: 0, rejected: 0 }
        };
      });

      stepStatusData.forEach((row) => {
        if (!stats[row.step]) return;
        stats[row.step] = {
          count: Number(row.count) || 0,
          statuses: {
            completed: Number(row.completed) || 0,
            in_progress: Number(row.in_progress) || 0,
            not_started: Number(row.not_started) || 0,
            waiting: Number(row.waiting) || 0,
            blocked: Number(row.blocked) || 0,
            rejected: Number(row.rejected) || 0,
          }
        };
      });

      setStepStats(stats);
      setStatusSummary(statusData);
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalProjects = useMemo(
    () => statusSummary.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [statusSummary]
  );

  const completionRate = useMemo(() => {
    if (totalProjects === 0) {
      return 0;
    }

    const completedCount = statusSummary.find((item) => item.status === 'completed');
    return Math.round((Number(completedCount?.count || 0) / totalProjects) * 100);
  }, [statusSummary, totalProjects]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse mt-2"></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-slate-200 rounded animate-pulse mt-1"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-3 w-6 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-6"></div>
          <div className="h-48 bg-slate-100 rounded animate-pulse"></div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2.5fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">สถานะตามขั้นตอน (Pipeline)</h2>
          <p className="mt-1 text-sm text-slate-500">แสดงโครงการตามขั้นตอนปัจจุบันใน workflow</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {STEP_ORDER.map((step, index) => {
            const stepData = stepStats[step] || {
              count: 0,
              statuses: { completed: 0, in_progress: 0, not_started: 0, waiting: 0, blocked: 0, rejected: 0 }
            };

            return (
              <div key={step} className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{STEP_LABELS[step]}</p>
                    <p className="text-sm text-slate-500">{stepData.count} โครงการ</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(stepData.statuses).map(([statusKey, count]) => (
                    <div key={statusKey} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[statusKey] }}
                        />
                        {STATUS_LABELS[statusKey]}
                      </span>
                      <span className="font-semibold text-slate-800">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>ความคืบหน้าโดยรวม</span>
            <span className="font-semibold text-blue-600">{completionRate}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">สัดส่วนตามสถานะ</h2>
          <p className="mt-1 text-sm text-slate-500">ภาพรวมสถานะโครงการทั้งหมดในระบบ</p>
        </div>

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between xl:flex-col xl:items-stretch">
          <div className="h-64 w-full xl:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusSummary}
                  innerRadius={72}
                  outerRadius={102}
                  paddingAngle={3}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {statusSummary.map((item, index) => (
                    <Cell key={item.status} fill={piePalette[index % piePalette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-40 text-center">
              <p className="text-4xl font-bold text-slate-900">{totalProjects}</p>
              <p className="text-sm text-slate-500">โครงการ</p>
            </div>
          </div>

          <div className="space-y-3">
            {statusSummary.map((item, index) => (
              <div key={item.status} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: piePalette[index % piePalette.length] }}
                  />
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                <span className="font-semibold text-slate-900">
                  {Number(item.percentage || 0).toFixed(1)}% ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            พร้อมส่งมอบ
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={16} className="text-amber-500" />
            กำลังดำเนินการ
          </span>
          <span className="inline-flex items-center gap-2">
            <Circle size={16} className="text-slate-400" />
            ติดตามต่อเนื่อง
          </span>
        </div>
      </section>
    </div>
  );
});

export default Pipeline;
