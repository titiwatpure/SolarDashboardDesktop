import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

export default function ReadyToSubmit() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentReviewAPI.getReadyToSubmit();
      setItems(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // กลุ่มตามโครงการ
  const grouped = items.reduce((acc, item) => {
    const key = item.project_id;
    if (!acc[key]) {
      acc[key] = {
        project_code: item.project_code,
        project_name: item.project_name,
        project_id: item.project_id,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const filtered = Object.values(grouped).filter(group => {
    if (!search) return true;
    const q = search.toLowerCase();
    return group.project_name?.toLowerCase().includes(q)
      || group.project_code?.toLowerCase().includes(q)
      || group.items.some(i => i.document_name?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate('/doc-review')} className="text-sm text-blue-600 hover:text-blue-700 mb-2">← กลับ Dashboard</button>
          <h1 className="text-3xl font-bold text-slate-900">สรุปส่งหน่วยงานวันนี้</h1>
          <p className="text-slate-500 mt-1">เอกสารที่ตรวจผ่านแล้ว แต่ยังไม่ได้ยื่นหน่วยงาน</p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-slate-500">เอกสารพร้อมส่ง</div>
              <div className="text-3xl font-bold text-emerald-600">{items.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">โครงการ</div>
              <div className="text-3xl font-bold text-slate-900">{Object.keys(grouped).length}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสารหรือโครงการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={loadData} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50">รีเฟรช</button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">กำลังโหลด...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {items.length === 0 ? 'ไม่มีเอกสารที่ต้องส่งวันนี้' : 'ไม่พบผลการค้นหา'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(group => (
              <div key={group.project_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 cursor-pointer hover:bg-emerald-100 transition"
                  onClick={() => navigate(`/doc-review/${group.project_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-emerald-600">{group.project_code}</span>
                      <h3 className="font-semibold text-slate-900">{group.project_name}</h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {group.items.length} รายการ
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{item.document_name}</div>
                          {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.permit_type && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.permit_type}</span>}
                        <span className="text-xs text-slate-400">{new Date(item.passed_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
