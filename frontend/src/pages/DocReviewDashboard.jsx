/**
 * DocReviewDashboard - แดชบอร์ดสรุปสถานะเอกสาร
 * Source of truth: submission_packages.package_status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const UNIFIED_STATUSES = {
  waiting_documents: { label: 'รอเอกสาร', color: 'bg-slate-400' },
  internal_review: { label: 'กำลังตรวจ', color: 'bg-blue-500' },
  customer_revision: { label: 'รอลูกค้าแก้', color: 'bg-orange-500' },
  ready_to_submit: { label: 'พร้อมยื่น', color: 'bg-purple-500' },
  submitted_agency: { label: 'ยื่นแล้ว', color: 'bg-indigo-500' },
  agency_revision: { label: 'หน่วยงานให้แก้', color: 'bg-red-500' },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-emerald-500' },
};

const STATUS_BADGE = {
  waiting_documents: 'bg-slate-100 text-slate-700',
  internal_review: 'bg-blue-100 text-blue-700',
  customer_revision: 'bg-orange-100 text-orange-700',
  ready_to_submit: 'bg-purple-100 text-purple-700',
  submitted_agency: 'bg-indigo-100 text-indigo-700',
  agency_revision: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function DocReviewDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes] = await Promise.all([
        documentReviewAPI.getReviewSummary(),
      ]);
      setSummary(summaryRes);

      // ดึง packages ทั้งหมด (ผ่าน projects แต่ละตัว)
      const projList = await documentReviewAPI.getReviewProjects();
      const projArray = Array.isArray(projList) ? projList : [];
      const allPkgs = [];
      for (const p of projArray) {
        try {
          const pkgs = await documentReviewAPI.getPackages(p.id);
          if (Array.isArray(pkgs)) {
            pkgs.forEach(pkg => {
              allPkgs.push({
                ...pkg,
                project_code: p.project_code,
                project_name: p.project_name,
                customer_name: p.customer_name,
              });
            });
          }
        } catch (e) { /* skip */ }
      }
      setPackages(allPkgs);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = packages.filter(p => {
    if (filter.status && p.package_status !== filter.status) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!p.project_code?.toLowerCase().includes(q) && !p.package_name?.toLowerCase().includes(q) && !p.project_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">ระบบตรวจเอกสารและยื่นหน่วยงาน</h1>
            <p className="mt-2 text-base text-slate-500">ติดตามสถานะเอกสารยื่นขออนุญาตทุกโครงการ</p>
          </div>
          <button
            onClick={() => navigate('/doc-review/new')}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + สร้างโครงการใหม่
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      {summary && (
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(UNIFIED_STATUSES).map(([key, { label, color }]) => (
            <SummaryCard key={key} label={label} count={summary[key] || 0} color={color} />
          ))}
        </section>
      )}

      {/* Filters */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="ค้นหาโครงการ / ชุดเอกสาร..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(UNIFIED_STATUSES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Package Table */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">รหัสโครงการ</th>
                <th className="px-6 py-4 text-left font-semibold">ชุดเอกสาร / หน่วยงาน</th>
                <th className="px-6 py-4 text-left font-semibold">ลูกค้า</th>
                <th className="px-6 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-6 py-4 text-left font-semibold">ความคืบหน้า</th>
                <th className="px-6 py-4 text-left font-semibold">กำหนดส่ง</th>
                <th className="px-6 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-400">ยังไม่มีชุดเอกสาร</td>
                </tr>
              ) : (
                filtered.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/doc-review/${pkg.project_id}`)}>
                    <td className="px-6 py-4 font-medium text-blue-600">{pkg.project_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{pkg.package_name}</p>
                      <p className="text-xs text-slate-500">{pkg.agency || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{pkg.customer_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[pkg.package_status] || 'bg-slate-100 text-slate-600'}`}>
                        {UNIFIED_STATUSES[pkg.package_status]?.label || pkg.package_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pkg.total_docs > 0 ? Math.round((pkg.passed_docs / pkg.total_docs) * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pkg.passed_docs || 0}/{pkg.total_docs || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{pkg.due_date || '-'}</td>
                    <td className="px-6 py-4">
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">ดู →</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, count, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{count}</p>
    </div>
  );
}
