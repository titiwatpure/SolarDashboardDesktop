import { useState, useEffect } from 'react';
import { knowledgeBaseAPI } from '../utils/api';

export default function KnowledgeBaseSettings() {
  const [stats, setStats] = useState({ total: 0, categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [items, categories] = await Promise.all([
        knowledgeBaseAPI.getAll(),
        knowledgeBaseAPI.getCategories(),
      ]);
      setStats({
        total: Array.isArray(items) ? items.length : 0,
        categories: Array.isArray(categories) ? categories : [],
      });
    } catch (err) {
      console.error('Failed to load KB stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-slate-500">รายการทั้งหมด</div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{stats.categories.length}</div>
          <div className="text-xs text-slate-500">หมวดหมู่</div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">20 MB</div>
          <div className="text-xs text-slate-500">ขนาดไฟล์สูงสุด</div>
        </div>
      </div>

      {/* Categories */}
      {stats.categories.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 mb-2">หมวดหมู่ที่มีอยู่</h4>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map((cat, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                {cat.category}: {cat.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Link */}
      <a
        href="/knowledge-base"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-6M14 4h6m0 0v6m0-6L10 14"></path>
        </svg>
        จัดการ Knowledge Base →
      </a>
    </div>
  );
}
