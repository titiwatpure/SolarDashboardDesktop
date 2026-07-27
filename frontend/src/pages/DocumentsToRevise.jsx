import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const STATUS_LABELS = {
  customer_revision: { label: 'ต้องแก้ไข', color: 'bg-amber-100 text-amber-700' },
};

export default function DocumentsToRevise() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('all');

  useEffect(() => {
    loadRevisions();
  }, []);

  const loadRevisions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentReviewAPI.getPendingRevisions();
      setItems(data);
    } catch (err) {
      console.error('Failed to load pending revisions:', err);
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

  // Filter
  const filtered = Object.values(grouped).filter(group => {
    if (filterProject !== 'all' && group.project_id !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchProject = group.project_name?.toLowerCase().includes(q) || group.project_code?.toLowerCase().includes(q);
      const matchDoc = group.items.some(i => i.document_name?.toLowerCase().includes(q));
      if (!matchProject && !matchDoc) return false;
    }
    return true;
  });

  const totalItems = items.length;
  const projectCount = Object.keys(grouped).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/doc-review')} className="text-sm text-blue-600 hover:text-blue-700 mb-2">
            ← กลับ Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900">เอกสารต้องแก้</h1>
          <p className="text-slate-500 mt-1">รายการเอกสารที่ส่งกลับให้ลูกค้าแก้ไข รวมทุกโครงการ</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">เอกสารทั้งหมด</div>
            <div className="text-3xl font-bold text-amber-600">{totalItems}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">โครงการที่ได้รับผลกระทบ</div>
            <div className="text-3xl font-bold text-slate-900">{projectCount}</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสารหรือโครงการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="all">ทุกโครงการ</option>
            {Object.values(grouped).map(g => (
              <option key={g.project_id} value={g.project_id}>
                {g.project_code} — {g.project_name}
              </option>
            ))}
          </select>
          <button
            onClick={loadRevisions}
            className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            รีเฟรช
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">กำลังโหลด...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {items.length === 0 ? 'ไม่มีเอกสารที่ต้องแก้ไข' : 'ไม่พบผลการค้นหา'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(group => (
              <div key={group.project_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Project Header */}
                <div
                  className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => navigate(`/doc-review/${group.project_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-slate-500">{group.project_code}</span>
                      <h3 className="font-semibold text-slate-900">{group.project_name}</h3>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {group.items.length} รายการ
                    </span>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="divide-y divide-slate-100">
                  {group.items.map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{item.document_name}</div>
                          {item.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.permit_type && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.permit_type}</span>
                        )}
                        {item.is_required === 1 && (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">จำเป็น</span>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(item.checklist_updated_at).toLocaleDateString('th-TH')}
                        </span>
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
