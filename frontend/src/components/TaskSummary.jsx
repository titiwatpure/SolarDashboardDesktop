import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../utils/api';

const TaskSummary = memo(function TaskSummary() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await reportsAPI.getSummaryByTasks();
      // API returns array grouped by priority: [{ priority, total, pending, in_progress, completed, cancelled, overdue }]
      const arr = Array.isArray(data) ? data : (data?.tasks || []);
      const sum = arr.reduce((acc, row) => ({
        pending: acc.pending + (row.pending || 0),
        in_progress: acc.in_progress + (row.in_progress || 0),
        completed: acc.completed + (row.completed || 0),
        cancelled: acc.cancelled + (row.cancelled || 0),
        overdue: acc.overdue + (row.overdue || 0),
      }), { pending: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });

      setStats({
        total: sum.pending + sum.in_progress + sum.completed + sum.cancelled,
        ...sum,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { key: 'total', label: 'งานทั้งหมด', value: stats.total, color: 'slate', bg: 'bg-slate-50' },
    { key: 'in_progress', label: 'กำลังทำ', value: stats.in_progress, color: 'blue', bg: 'bg-blue-50' },
    { key: 'pending', label: 'รอดำเนินการ', value: stats.pending, color: 'amber', bg: 'bg-amber-50' },
    { key: 'overdue', label: 'เกินกำหนด', value: stats.overdue, color: 'red', bg: 'bg-red-50' },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">สรุปงาน</h2>
          <p className="text-sm text-slate-500">ภาพรวม Task ทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(card => (
          <div key={card.key} className={`rounded-xl ${card.bg} p-4 text-center`}>
            {loading ? (
              <div className="h-8 w-12 mx-auto rounded bg-slate-200 animate-pulse"></div>
            ) : (
              <p className={`text-3xl font-bold text-${card.color}-600`}>{card.value}</p>
            )}
            <p className="text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {!loading && stats.total > 0 && (
        <button
          onClick={() => navigate('/tasks')}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ดูงานทั้งหมด →
        </button>
      )}
    </section>
  );
});

export default TaskSummary;
