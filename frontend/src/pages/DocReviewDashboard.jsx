/**
 * DocReviewDashboard - แดชบอร์ดสรุปสถานะเอกสาร
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const STATUS_LABELS = {
  waiting_documents: 'รอเอกสาร',
  internal_review: 'กำลังตรวจ',
  waiting_customer_revision: 'รอลูกค้าแก้',
  ready_to_submit: 'พร้อมยื่น',
  submitted: 'ยื่นแล้ว',
  agency_revision: 'หน่วยงานให้แก้',
  approved: 'อนุมัติแล้ว',
  closed: 'ปิดงาน'
};

const STATUS_COLORS = {
  waiting_documents: 'bg-slate-100 text-slate-700',
  internal_review: 'bg-blue-100 text-blue-700',
  waiting_customer_revision: 'bg-orange-100 text-orange-700',
  ready_to_submit: 'bg-purple-100 text-purple-700',
  submitted: 'bg-amber-100 text-amber-700',
  agency_revision: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500'
};

const PERMIT_TYPES = {
  a1: 'อ.1 ขออนุญาตก่อสร้าง',
  rong4: 'รง.4 แจ้งประกอบกิจการ',
  pck2: 'พค.2 ใบอนุญาตผลิตพลังงานควบคุม',
  erc: 'อนุมัติ กกพ.',
  sld: 'SLD ผังระบบไฟฟ้า'
};

const PIPELINE_BG = {
  emerald: 'bg-emerald-100',
  blue: 'bg-blue-100',
  purple: 'bg-purple-100',
  indigo: 'bg-indigo-100',
  cyan: 'bg-cyan-100',
  green: 'bg-green-100',
};

const PIPELINE_STAGES = [
  { key: 'receiving', label: 'รับเอกสาร', color: 'emerald', icon: '📥' },
  { key: 'reviewing', label: 'กำลังตรวจ', color: 'blue', icon: '🔍' },
  { key: 'passed', label: 'ผ่านแล้ว', color: 'purple', icon: '✓' },
  { key: 'submitted', label: 'ยื่นแล้ว', color: 'indigo', icon: '📤' },
  { key: 'tracking', label: 'ติดตามผล', color: 'cyan', icon: '📋' },
  { key: 'approved', label: 'อนุมัติ', color: 'green', icon: '✅' },
];

function getProjectStage(project) {
  const s = project.project_status;
  if (s === 'waiting_documents' || s === 'waiting_customer_revision') return 'receiving';
  if (s === 'internal_review') return 'reviewing';
  if (s === 'ready_to_submit') return 'passed';
  if (s === 'submitted') return 'submitted';
  if (s === 'agency_revision') return 'tracking';
  if (s === 'approved' || s === 'closed') return 'approved';
  return 'receiving';
}

export default function DocReviewDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', permit_type: '', search: '' });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, projectsRes] = await Promise.all([
        documentReviewAPI.getReviewSummary(),
        documentReviewAPI.getReviewProjects(filter)
      ]);
      setSummary(summaryRes);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Summary Cards */}
      {summary && (
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <SummaryCard label="ทั้งหมด" count={summary.total || 0} color="bg-slate-500" />
          <SummaryCard label="รอเอกสาร" count={summary.waiting_documents || 0} color="bg-slate-400" />
          <SummaryCard label="กำลังตรวจ" count={summary.internal_review || 0} color="bg-blue-500" />
          <SummaryCard label="รอลูกค้าแก้" count={summary.waiting_customer_revision || 0} color="bg-orange-500" />
          <SummaryCard label="พร้อมยื่น" count={summary.ready_to_submit || 0} color="bg-purple-500" />
          <SummaryCard label="ยื่นแล้ว" count={summary.submitted || 0} color="bg-amber-500" />
          <SummaryCard label="หน่วยงานให้แก้" count={summary.agency_revision || 0} color="bg-red-500" />
          <SummaryCard label="อนุมัติแล้ว" count={summary.approved || 0} color="bg-emerald-500" />
        </section>
      )}

      {/* Pipeline View */}
      {projects.length > 0 && <PipelineSummary projects={projects} />}

      {/* Filters */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="ค้นหาโครงการ..."
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
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filter.permit_type}
            onChange={(e) => setFilter({ ...filter, permit_type: e.target.value })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            <option value="">ทุกประเภท</option>
            {Object.entries(PERMIT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Project List */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">รหัสโครงการ</th>
                <th className="px-6 py-4 text-left font-semibold">ชื่อโครงการ</th>
                <th className="px-6 py-4 text-left font-semibold">ลูกค้า</th>
                <th className="px-6 py-4 text-left font-semibold">ประเภทใบอนุญาต</th>
                <th className="px-6 py-4 text-left font-semibold">Pipeline</th>
                <th className="px-6 py-4 text-left font-semibold">ความคืบหน้า</th>
                <th className="px-6 py-4 text-left font-semibold">กำหนดส่ง</th>
                <th className="px-6 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-slate-400">ยังไม่มีโครงการ</td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/doc-review/${project.id}`)}>
                    <td className="px-6 py-4 font-medium text-blue-600">{project.project_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{project.project_name}</td>
                    <td className="px-6 py-4 text-slate-600">{project.customer_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{PERMIT_TYPES[project.permit_type] || project.permit_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <PipelineBadge project={project} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{project.due_date || '-'}</td>
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

function PipelineSummary({ projects }) {
  const counts = PIPELINE_STAGES.map(s => ({
    ...s,
    count: projects.filter(p => getProjectStage(p) === s.key).length
  }));
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 mb-3">Pipeline สถานะเอกสาร</h3>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {counts.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl ${PIPELINE_BG[stage.color] || 'bg-slate-100'} flex items-center justify-center text-lg`}>{stage.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900">{stage.count}</p>
              <p className="text-xs text-slate-500 whitespace-nowrap">{stage.label}</p>
            </div>
            {i < counts.length - 1 && <span className="text-slate-300 mx-1 text-lg">→</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

const PIPELINE_BADGE = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  green: 'bg-green-100 text-green-700',
};

function PipelineBadge({ project }) {
  const stage = PIPELINE_STAGES.find(s => s.key === getProjectStage(project));
  if (!stage) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PIPELINE_BADGE[stage.color] || 'bg-slate-100 text-slate-700'}`}>
      {stage.icon} {stage.label}
    </span>
  );
}
