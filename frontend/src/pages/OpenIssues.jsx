import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const SOURCE_LABELS = {
  internal: { label: 'ภายใน', color: 'bg-blue-100 text-blue-700' },
  agency: { label: 'หน่วยงาน', color: 'bg-purple-100 text-purple-700' },
  customer: { label: 'ลูกค้า', color: 'bg-orange-100 text-orange-700' },
};

export default function OpenIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentReviewAPI.getOpenIssues();
      setIssues(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filtered = issues.filter(issue => {
    if (filterSource !== 'all' && issue.issue_source !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      return issue.description?.toLowerCase().includes(q)
        || issue.document_name?.toLowerCase().includes(q)
        || issue.project_name?.toLowerCase().includes(q)
        || issue.project_code?.toLowerCase().includes(q);
    }
    return true;
  });

  // กลุ่มตามโครงการ
  const grouped = filtered.reduce((acc, issue) => {
    const key = issue.project_id;
    if (!acc[key]) {
      acc[key] = {
        project_code: issue.project_code,
        project_name: issue.project_name,
        project_id: issue.project_id,
        issues: [],
      };
    }
    acc[key].issues.push(issue);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate('/doc-review')} className="text-sm text-blue-600 hover:text-blue-700 mb-2">← กลับ Dashboard</button>
          <h1 className="text-3xl font-bold text-slate-900">ปัญหาเอกสาร</h1>
          <p className="text-slate-500 mt-1">รายการปัญหาที่ต้องแก้ไข รวมทุกโครงการ</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">ปัญหาทั้งหมด</div>
            <div className="text-3xl font-bold text-red-600">{issues.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">โครงการที่ได้รับผลกระทบ</div>
            <div className="text-3xl font-bold text-slate-900">{Object.keys(grouped).length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">จากหน่วยงาน</div>
            <div className="text-3xl font-bold text-purple-600">{issues.filter(i => i.issue_source === 'agency').length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="ค้นหาปัญหาหรือโครงการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="all">ทุกแหล่ง</option>
            <option value="internal">ภายใน</option>
            <option value="agency">หน่วยงาน</option>
            <option value="customer">ลูกค้า</option>
          </select>
          <button onClick={loadData} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50">รีเฟรช</button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">กำลังโหลด...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {issues.length === 0 ? 'ไม่มีปัญหาเอกสารค้างอยู่' : 'ไม่พบผลการค้นหา'}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(grouped).map(group => (
              <div key={group.project_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="px-6 py-4 bg-red-50 border-b border-red-100 cursor-pointer hover:bg-red-100 transition"
                  onClick={() => navigate(`/doc-review/${group.project_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-red-600">{group.project_code}</span>
                      <h3 className="font-semibold text-slate-900">{group.project_name}</h3>
                    </div>
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {group.issues.length} ปัญหา
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.issues.map(issue => (
                    <div key={issue.id} className="px-6 py-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500">{issue.document_name}</span>
                            {issue.issue_source && SOURCE_LABELS[issue.issue_source] && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_LABELS[issue.issue_source].color}`}>
                                {SOURCE_LABELS[issue.issue_source].label}
                              </span>
                            )}
                            {issue.revision_round > 1 && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">รอบ {issue.revision_round}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800">{issue.description}</p>
                          {issue.required_action && (
                            <p className="text-xs text-amber-600 mt-1">ต้องดำเนินการ: {issue.required_action}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-slate-400">{new Date(issue.created_at).toLocaleDateString('th-TH')}</div>
                          {issue.created_by_name && <div className="text-xs text-slate-500 mt-0.5">{issue.created_by_name}</div>}
                        </div>
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
