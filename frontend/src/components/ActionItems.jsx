import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const ActionItems = memo(function ActionItems() {
  const navigate = useNavigate();
  const [data, setData] = useState({ pending: 0, ready: 0, issues: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pending, ready, issues] = await Promise.all([
        documentReviewAPI.getPendingRevisions().catch(() => []),
        documentReviewAPI.getReadyToSubmit().catch(() => []),
        documentReviewAPI.getOpenIssues().catch(() => []),
      ]);
      setData({
        pending: Array.isArray(pending) ? pending.length : 0,
        ready: Array.isArray(ready) ? ready.length : 0,
        issues: Array.isArray(issues) ? issues.length : 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'pending',
      label: 'เอกสารต้องแก้',
      desc: 'ส่งกลับให้ลูกค้าแก้ไข',
      count: data.pending,
      color: 'amber',
      path: '/doc-review/pending-revisions',
    },
    {
      key: 'ready',
      label: 'พร้อมส่งหน่วยงาน',
      desc: 'ตรวจผ่านแล้ว แต่ยังไม่ได้ยื่น',
      count: data.ready,
      color: 'emerald',
      path: '/doc-review/ready-to-submit',
    },
    {
      key: 'issues',
      label: 'ปัญหาเอกสาร',
      desc: 'ปัญหาที่ต้องแก้ไข',
      count: data.issues,
      color: 'red',
      path: '/doc-review/open-issues',
    },
  ];

  const colorMap = {
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', link: 'text-amber-600 hover:text-amber-700' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', link: 'text-emerald-600 hover:text-emerald-700' },
    red: { border: 'border-red-200', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', link: 'text-red-600 hover:text-red-700' },
  };

  const icons = { pending: '📄', ready: '📤', issues: '⚠️' };

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">สิ่งที่ต้องทำวันนี้</h2>
          <p className="text-sm text-slate-500">เอกสารและปัญหาที่ต้องดำเนินการ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => {
          const c = colorMap[item.color];
          return (
            <div key={item.key} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icons[item.key]}</span>
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
                {loading ? (
                  <div className="h-6 w-10 rounded-full bg-slate-200 animate-pulse"></div>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${c.badge}`}>{item.count}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">{item.desc}</p>
              {!loading && item.count > 0 && (
                <button
                  onClick={() => navigate(item.path)}
                  className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${c.link}`}
                >
                  ดูเลย →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default ActionItems;
