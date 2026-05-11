import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Printer, Calendar, MapPin, Zap,
  AlertTriangle, CheckCircle2, Clock, FileText, Building2, User
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { projectsAPI, tasksAPI, documentsAPI } from '../utils/api';
import {
  STATUS_LABELS, STEP_LABELS, RISK_LEVELS, ROLES,
  PRIORITY_LABELS, CHECKPOINT_STATUSES, APPROVAL_STATUSES, PERMIT_TYPES
} from '../utils/constants';
import { SARABUN_BASE64 } from '../utils/thaiFont';

const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

const formatDate = (v) => v ? new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
const formatDateTime = (v) => v ? new Date(v).toLocaleString('th-TH') : '-';

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

export default function ProjectReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [proj, tl, cps, taskRes, docRes, orgRes] = await Promise.all([
        projectsAPI.getById(id),
        projectsAPI.getTimeline(id),
        projectsAPI.getCheckpoints(id),
        tasksAPI.getAll({ project_id: id, limit: 100 }),
        documentsAPI.getByProject(id),
        projectsAPI.getOrganizations(id),
      ]);
      setProject(proj);
      setTimeline(Array.isArray(tl) ? tl : []);
      setCheckpoints(Array.isArray(cps) ? cps : (cps.data || []));
      setTasks(Array.isArray(taskRes) ? taskRes : (taskRes.data || []));
      setDocuments(Array.isArray(docRes) ? docRes : (docRes.data || []));
      setOrganizations(Array.isArray(orgRes) ? orgRes : (orgRes.data || []));
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = STEP_ORDER.indexOf(project?.current_step);
  const progress = project?.progress ?? 0;
  const delayDays = daysBetween(project?.expected_cod_date, new Date().toISOString());
  const risk = RISK_LEVELS[project?.risk_level] || RISK_LEVELS.low;
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status));

  const handleExportPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    const w = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(16);
    doc.text(`รายงานโครงการ: ${project.project_name}`, w / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.text(`${project.project_code} | ${project.size_kw} kW | ${project.province}`, w / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(11);
    doc.text(`ความคืบหน้า: ${progress}% | สถานะ: ${STATUS_LABELS[project.status]} | ความเสี่ยง: ${risk.label}`, 14, y);
    y += 7;
    doc.text(`วันที่เริ่ม: ${formatDate(project.start_date)} | คาดว่าเสร็จ: ${formatDate(project.expected_cod_date)}`, 14, y);
    y += 10;

    // Steps
    autoTable(doc, {
      startY: y,
      head: [['ขั้นตอน', 'สถานะ', 'วันที่']],
      body: STEP_ORDER.map((step) => {
        const tlEntry = timeline.find((t) => t.step === step);
        const isCurrent = step === project.current_step;
        const isDone = STEP_ORDER.indexOf(step) < currentIdx;
        return [
          STEP_LABELS[step],
          isDone ? 'เสร็จแล้ว' : isCurrent ? 'กำลังดำเนินการ' : 'รอ',
          tlEntry ? formatDateTime(tlEntry.created_at) : '-',
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 },
      didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Checkpoints
    if (checkpoints.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text(`จุดตรวจสอบ (${checkpoints.filter((c) => c.status === 'passed').length}/${checkpoints.length} ผ่าน)`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['ชื่อ', 'ขั้นตอน', 'สถานะ', 'วันที่']],
        body: checkpoints.map((c) => [
          c.checkpoint_name,
          STEP_LABELS[c.step] || c.step,
          CHECKPOINT_STATUSES[c.status]?.label || c.status,
          c.completed_at ? formatDate(c.completed_at) : '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { font: 'Sarabun', fontSize: 9 },
        didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Tasks
    if (tasks.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text('งานที่มอบหมาย', 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['ชื่องาน', 'ความสำคัญ', 'สถานะ', 'ครบกำหนด']],
        body: tasks.map((t) => [
          t.title,
          PRIORITY_LABELS[t.priority] || t.priority,
          t.status === 'completed' ? 'เสร็จแล้ว' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ',
          t.due_date ? formatDate(t.due_date) : '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { font: 'Sarabun', fontSize: 9 },
        didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Documents
    if (documents.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text('เอกสาร', 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['ชื่อเอกสาร', 'ประเภท', 'วันที่อัปโหลด']],
        body: documents.map((d) => [
          d.document_name,
          d.document_type,
          formatDate(d.uploaded_at),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { font: 'Sarabun', fontSize: 9 },
        didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Organizations
    if (organizations.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text('หน่วยงานที่เกี่ยวข้อง', 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['หน่วยงาน', 'สถานะอนุมัติ', 'วันที่อนุมัติ']],
        body: organizations.map((o) => [
          o.org_name,
          APPROVAL_STATUSES[o.approval_status]?.label || o.approval_status,
          o.approved_at ? formatDate(o.approved_at) : '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { font: 'Sarabun', fontSize: 9 },
        didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
      });
    }

    doc.save(`รายงาน_${project.project_code}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">ไม่พบข้อมูลโครงการ</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm print:shadow-none print:border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 print:hidden"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-sm text-slate-500">{project.project_code}</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.project_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Zap size={14} /> {project.size_kw} kW / {project.size_kva} kVA</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {project.province}</span>
                <span className="flex items-center gap-1"><User size={14} /> {project.responsible_user_name || '-'}</span>
                {project.permit_type && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium">{PERMIT_TYPES[project.permit_type]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <Download size={16} /> ส่งออก PDF
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              <Printer size={16} /> พิมพ์
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">ความคืบหน้ารวม</span>
            <span className="font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Key info cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">สถานะ</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{STATUS_LABELS[project.status]}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">ความเสี่ยง</p>
            <p className="mt-1 text-sm font-bold" style={{ color: risk.color === 'bg-red-100 text-red-800' ? '#dc2626' : risk.color === 'bg-orange-100 text-orange-800' ? '#ea580c' : risk.color === 'bg-yellow-100 text-yellow-800' ? '#ca8a04' : '#16a34a' }}>
              {risk.label}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">วันที่เริ่ม</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(project.start_date)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">คาดว่าเสร็จ</p>
            <p className={`mt-1 text-sm font-bold ${delayDays > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(project.expected_cod_date)}
              {delayDays > 0 && <span className="ml-1 text-xs">({delayDays} วัน)</span>}
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">ขั้นตอนงาน</h2>
        <div className="space-y-3">
          {STEP_ORDER.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = step === project.current_step;
            const tlEntry = timeline.find((t) => t.step === step && (t.status === 'completed' || t.status === 'in_progress'));
            const cpForStep = checkpoints.filter((c) => c.step === step);
            const cpPassed = cpForStep.filter((c) => c.status === 'passed').length;
            const days = tlEntry ? daysBetween(tlEntry.created_at, timeline.find((t) => t.step === STEP_ORDER[idx + 1])?.created_at) : null;

            return (
              <div key={step} className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${isCurrent ? 'bg-blue-50 border border-blue-200' : isDone ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isDone ? <CheckCircle2 size={16} /> : isCurrent ? <Clock size={16} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {STEP_LABELS[step]}
                    </span>
                    {isCurrent && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">กำลังดำเนินการ</span>}
                    {isDone && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">เสร็จแล้ว</span>}
                  </div>
                  {tlEntry && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(tlEntry.created_at)}
                      {days !== null && days > 0 && ` (${days} วัน)`}
                    </p>
                  )}
                </div>
                {cpForStep.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">จุดตรวจสอบ</p>
                    <p className="text-sm font-semibold text-slate-700">{cpPassed}/{cpForStep.length}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Checkpoints */}
      {checkpoints.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            จุดตรวจสอบ ({checkpoints.filter((c) => c.status === 'passed').length}/{checkpoints.length} ผ่าน)
          </h2>
          <div className="space-y-2">
            {checkpoints.map((cp) => {
              const st = CHECKPOINT_STATUSES[cp.status] || {};
              return (
                <div key={cp.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-slate-50">
                  <div className={`h-2.5 w-2.5 rounded-full ${cp.status === 'passed' ? 'bg-emerald-500' : cp.status === 'failed' ? 'bg-red-500' : 'bg-slate-300'}`} />
                  <span className="flex-1 text-sm text-slate-700">{cp.checkpoint_name}</span>
                  <span className="text-xs text-slate-500">{STEP_LABELS[cp.step] || cp.step}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.color || 'bg-slate-100 text-slate-600'}`}>
                    {st.label || cp.status}
                  </span>
                  {cp.completed_at && <span className="text-xs text-slate-400">{formatDate(cp.completed_at)}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tasks */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">งานที่มอบหมาย ({tasks.length} รายการ)</h2>
          {overdueTasks.length > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              เกินกำหนด {overdueTasks.length} รายการ
            </span>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">ยังไม่มีงานที่มอบหมาย</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status);
              return (
                <div key={t.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${t.priority === 'urgent' ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-slate-400'}`} />
                  <span className="flex-1 text-sm text-slate-700">{t.title}</span>
                  <span className="text-xs text-slate-500">{PRIORITY_LABELS[t.priority]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {t.status === 'completed' ? 'เสร็จแล้ว' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ'}
                  </span>
                  {t.due_date && (
                    <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                      {formatDate(t.due_date)}
                      {isOverdue && ' ⚠'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">เอกสาร ({documents.length} รายการ)</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">ยังไม่มีเอกสาร</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-slate-50">
                <FileText size={16} className="text-slate-400" />
                <span className="flex-1 text-sm text-slate-700">{d.document_name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{d.document_type}</span>
                <span className="text-xs text-slate-400">{formatDate(d.uploaded_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Organizations */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">หน่วยงานที่เกี่ยวข้อง ({organizations.length} รายการ)</h2>
        {organizations.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">ยังไม่มีหน่วยงานที่เกี่ยวข้อง</p>
        ) : (
          <div className="space-y-2">
            {organizations.map((o) => {
              const st = APPROVAL_STATUSES[o.approval_status] || {};
              return (
                <div key={o.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-slate-50">
                  <Building2 size={16} className="text-slate-400" />
                  <span className="flex-1 text-sm font-medium text-slate-700">{o.org_name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color || 'bg-slate-100 text-slate-600'}`}>
                    {st.label || o.approval_status}
                  </span>
                  {o.approved_at && <span className="text-xs text-slate-400">{formatDate(o.approved_at)}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Risk */}
      {(project.risk_level && project.risk_level !== 'low') && (
        <section className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-red-600" />
            <h2 className="text-lg font-bold text-red-900">ความเสี่ยง</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="w-24 text-red-600 font-medium">ระดับ:</span>
              <span className="text-red-800 font-bold">{risk.label}</span>
            </div>
            {project.blocked_reason && (
              <div className="flex gap-3">
                <span className="w-24 text-red-600 font-medium">สาเหตุ:</span>
                <span className="text-red-800">{project.blocked_reason}</span>
              </div>
            )}
            {project.risk_factors && (
              <div className="flex gap-3">
                <span className="w-24 text-red-600 font-medium">ปัจจัย:</span>
                <span className="text-red-800">{project.risk_factors}</span>
              </div>
            )}
            {delayDays > 0 && (
              <div className="flex gap-3">
                <span className="w-24 text-red-600 font-medium">ล่าช้า:</span>
                <span className="text-red-800 font-bold">{delayDays} วัน</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Timeline history */}
      {timeline.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">ประวัติความคืบหน้า</h2>
          <div className="space-y-3">
            {timeline.map((t, idx) => (
              <div key={t.id || idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${t.status === 'completed' ? 'bg-emerald-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  {idx < timeline.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">{STEP_LABELS[t.step] || t.step}</span>
                    <span className="text-xs text-slate-500">{STATUS_LABELS[t.status] || t.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(t.created_at)}</p>
                  {t.note && <p className="text-sm text-slate-600 mt-1">{t.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
