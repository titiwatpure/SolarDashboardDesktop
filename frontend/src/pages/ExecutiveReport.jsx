import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsAPI, documentReviewAPI, reportsAPI, reportDraftsAPI } from '../utils/api';
import { STEP_LABELS, STATUS_LABELS } from '../utils/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

const STATUS_COLORS_BG = {
  completed: '#D1FAE5', in_progress: '#DBEAFE', not_started: '#F1F5F9',
  waiting: '#F3E8FF', blocked: '#FEE2E2', rejected: '#FFEDD5',
};
const STATUS_COLORS_TEXT = {
  completed: '#059669', in_progress: '#3b82f6', not_started: '#94a3b8',
  waiting: '#a855f7', blocked: '#DC2626', rejected: '#f97316',
};

const sectionStyle = { fontSize: 10, fontWeight: 600, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #E2E8F0' };
const tableHeaderStyle = { background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', fontSize: 9 };
const tableCellStyle = { padding: '6px 8px', borderBottom: '1px solid #E2E8F0', fontSize: 9 };

export default function ExecutiveReport() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isDraft = id && id !== 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [kpis, setKpis] = useState({});
  const [stepStats, setStepStats] = useState({});
  const [taskStats, setTaskStats] = useState({ total: 0, overdue: 0 });
  const [docStats, setDocStats] = useState({ pending: 0, ready: 0, issues: 0 });
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Draft data
  const [draft, setDraft] = useState({
    title: 'รายงานผู้บริหาร',
    report_date: new Date().toISOString().slice(0, 10),
    version: '1.0',
    summary: '',
    analysis: '',
    recommendations: '',
    notes: '',
    prepared_by: '',
    approved_by: '',
    action_items: [],
    custom_sections: [],
    comments: [],
  });

  useEffect(() => {
    loadAllData();
    if (isDraft) loadDraft();
  }, [id]);

  const loadAllData = async () => {
    try {
      const [projectsRes, kpisRes, stepRes, taskRes, pendingRes, readyRes, issuesRes] = await Promise.all([
        projectsAPI.getAll({ limit: 200 }),
        projectsAPI.getKPIs(),
        reportsAPI.getSummaryByStepStatus(),
        reportsAPI.getSummaryByTasks().catch(() => []),
        documentReviewAPI.getPendingRevisions().catch(() => []),
        documentReviewAPI.getReadyToSubmit().catch(() => []),
        documentReviewAPI.getOpenIssues().catch(() => []),
      ]);

      setProjects(Array.isArray(projectsRes?.data) ? projectsRes.data : []);
      setKpis(kpisRes || {});

      const stepData = Array.isArray(stepRes) ? stepRes : (stepRes?.data || []);
      const stats = {};
      STEP_ORDER.forEach(step => { stats[step] = { total: 0, completed: 0, in_progress: 0, blocked: 0 }; });
      stepData.forEach(row => {
        if (stats[row.step]) {
          stats[row.step].total += row.count || 0;
          if (row.status === 'completed') stats[row.step].completed = row.count || 0;
          if (row.status === 'in_progress') stats[row.step].in_progress = row.count || 0;
          if (row.status === 'blocked') stats[row.step].blocked = row.count || 0;
        }
      });
      setStepStats(stats);

      const taskArr = Array.isArray(taskRes) ? taskRes : [];
      const taskSum = taskArr.reduce((acc, row) => ({
        total: acc.total + (row.total || 0),
        overdue: acc.overdue + (row.overdue || 0),
      }), { total: 0, overdue: 0 });
      setTaskStats(taskSum);

      setDocStats({
        pending: Array.isArray(pendingRes) ? pendingRes.length : 0,
        ready: Array.isArray(readyRes) ? readyRes.length : 0,
        issues: Array.isArray(issuesRes) ? issuesRes.length : 0,
      });
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async () => {
    try {
      const data = await reportDraftsAPI.getById(id);
      setDraft({
        title: data.title || 'รายงานผู้บริหาร',
        report_date: data.report_date || new Date().toISOString().slice(0, 10),
        version: data.version || '1.0',
        summary: data.summary || '',
        analysis: data.analysis || '',
        recommendations: data.recommendations || '',
        notes: data.notes || '',
        prepared_by: data.prepared_by || '',
        approved_by: data.approved_by || '',
        action_items: Array.isArray(data.action_items) ? data.action_items : [],
        custom_sections: Array.isArray(data.custom_sections) ? data.custom_sections : [],
        comments: Array.isArray(data.comments) ? data.comments : [],
      });
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  // Action Items handlers
  const handleActionItemChange = (index, field, value) => {
    const newItems = [...draft.action_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setDraft(prev => ({ ...prev, action_items: newItems }));
  };

  const addActionItem = () => {
    setDraft(prev => ({
      ...prev,
      action_items: [...prev.action_items, { activity: '', responsible: '', due_date: '', status: 'pending', note: '' }],
    }));
  };

  const removeActionItem = (index) => {
    setDraft(prev => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index),
    }));
  };

  // Custom Sections handlers
  const addCustomSection = () => {
    setDraft(prev => ({
      ...prev,
      custom_sections: [...prev.custom_sections, { title: '', content: '' }],
    }));
  };

  const handleCustomSectionChange = (index, field, value) => {
    const newSections = [...draft.custom_sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setDraft(prev => ({ ...prev, custom_sections: newSections }));
  };

  const removeCustomSection = (index) => {
    setDraft(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.filter((_, i) => i !== index),
    }));
  };

  // Comments handlers
  const addComment = () => {
    setDraft(prev => ({
      ...prev,
      comments: [...prev.comments, { author: '', content: '', date: new Date().toISOString().slice(0, 10) }],
    }));
  };

  const handleCommentChange = (index, field, value) => {
    const newComments = [...draft.comments];
    newComments[index] = { ...newComments[index], [field]: value };
    setDraft(prev => ({ ...prev, comments: newComments }));
  };

  const removeComment = (index) => {
    setDraft(prev => ({
      ...prev,
      comments: prev.comments.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isDraft) {
        await reportDraftsAPI.update(id, draft);
      } else {
        const result = await reportDraftsAPI.create(draft);
        navigate(`/executive-report/${result.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const attentionProjects = useMemo(() => {
    const now = Date.now();
    return projects
      .filter(p => p.status !== 'completed' && p.status !== 'not_started')
      .map(p => {
        const updated = new Date(p.updated_at || p.created_at).getTime();
        const daysSince = Math.floor((now - updated) / (24 * 60 * 60 * 1000));
        return { ...p, daysSince };
      })
      .filter(p => p.status === 'blocked' || p.risk_level === 'high' || p.risk_level === 'critical' || p.daysSince >= 14)
      .sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, blocked: 2 };
        const aRisk = riskOrder[a.risk_level] ?? (a.status === 'blocked' ? 2 : 3);
        const bRisk = riskOrder[b.risk_level] ?? (b.status === 'blocked' ? 2 : 3);
        if (aRisk !== bRisk) return aRisk - bRisk;
        return b.daysSince - a.daysSince;
      })
      .slice(0, 5);
  }, [projects]);

  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status !== 'completed' && (p.progress || 0) < 100);
  }, [projects]);

  const stepSummary = useMemo(() => {
    return STEP_ORDER.map(step => {
      const s = stepStats[step] || { total: 0, completed: 0 };
      return { step, label: STEP_LABELS[step] || step, ...s };
    });
  }, [stepStats]);

  const totalProjects = kpis.total_projects || projects.length;
  const now = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`executive-report-${draft.report_date}-${draft.version}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-slate-500">กำลังโหลดรายงาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Action Bar */}
      <div className="mx-auto mb-4 flex justify-between items-center no-print" style={{ maxWidth: '210mm' }}>
        <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          กลับ
        </button>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition">
            {saving ? 'กำลังบันทึก...' : isDraft ? 'บันทึก' : 'บันทึก Draft'}
          </button>
          <button onClick={handleExportPDF} disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก PDF'}
          </button>
        </div>
      </div>

      {/* A4 Report Container */}
      <div ref={reportRef} className="mx-auto bg-white shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 18mm', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '3px solid #1E3A5F', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: '#1E3A5F', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>S</div>
            <div>
              <input value={draft.title} onChange={e => handleDraftChange('title', e.target.value)}
                style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', border: 'none', background: 'transparent', width: '100%', padding: 0 }}
                placeholder="ชื่อรายงาน" />
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Solar Dashboard — Executive Report</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>
            <div>วันที่: <input type="date" value={draft.report_date} onChange={e => handleDraftChange('report_date', e.target.value)}
              style={{ border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10 }} /></div>
            <div>เวอร์ชัน: <input value={draft.version} onChange={e => handleDraftChange('version', e.target.value)}
              style={{ border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10, width: 40 }} /></div>
          </div>
        </div>

        {/* KPI Summary */}
        <div style={sectionStyle}>1. ภาพรวมโครงการ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 14 }}>
          {[
            { num: totalProjects, label: 'ทั้งหมด', color: '#1E3A5F', bg: '#EFF6FF' },
            { num: kpis.exemption || 0, label: 'ยกเว้น', color: '#059669', bg: '#ECFDF5' },
            { num: kpis.permit || 0, label: 'ขออนุญาต', color: '#D97706', bg: '#FFFBEB' },
            { num: kpis.in_progress || 0, label: 'กำลังทำ', color: '#3b82f6', bg: '#EFF6FF' },
            { num: kpis.blocked || 0, label: 'ติดปัญหา', color: '#DC2626', bg: '#FEF2F2' },
            { num: kpis.completed || 0, label: 'เสร็จแล้ว', color: '#059669', bg: '#ECFDF5' },
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: kpi.bg, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.num}</div>
              <div style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div style={sectionStyle}>2. สถานะตามขั้นตอน</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
          {stepSummary.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, background: s.total > 0 ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.blocked > 0 ? '#DC2626' : s.total > 0 ? '#1E3A5F' : '#94a3b8' }}>{s.total}</div>
              <div style={{ fontSize: 7, color: '#475569', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action Items from DB */}
        <div style={sectionStyle}>3. สิ่งที่ต้องดำเนินการ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
          {[
            { label: 'เอกสารต้องแก้', count: docStats.pending, color: '#D97706', bg: '#FFFBEB' },
            { label: 'พร้อมส่งหน่วยงาน', count: docStats.ready, color: '#059669', bg: '#ECFDF5' },
            { label: 'ปัญหาเอกสาร', count: docStats.issues, color: '#DC2626', bg: '#FEF2F2' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: item.bg, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.count}</div>
              <div style={{ fontSize: 8, color: '#475569' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Attention Projects */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionStyle}>4. โครงการต้องติดตาม</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, width: 60 }}>รหัส</th>
                <th style={tableHeaderStyle}>ชื่อโครงการ</th>
                <th style={{ ...tableHeaderStyle, width: 55 }}>ขั้นตอน</th>
                <th style={{ ...tableHeaderStyle, width: 60 }}>สถานะ</th>
                <th style={{ ...tableHeaderStyle, width: 40 }}>วัน</th>
              </tr>
            </thead>
            <tbody>
              {attentionProjects.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 8, textAlign: 'center', color: '#94a3b8' }}>ไม่มีโครงการที่ต้องติดตาม</td></tr>
              ) : attentionProjects.map(p => (
                <tr key={p.id}>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>{p.project_code}</td>
                  <td style={tableCellStyle}>{(p.project_name || '').substring(0, 35)}</td>
                  <td style={tableCellStyle}>{STEP_LABELS[p.current_step] || p.current_step}</td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 8, fontSize: 7, fontWeight: 600,
                      background: p.risk_level === 'critical' ? '#FEE2E2' : p.status === 'blocked' ? '#FEE2E2' : '#FEF3C7',
                      color: p.risk_level === 'critical' ? '#DC2626' : p.status === 'blocked' ? '#DC2626' : '#D97706',
                    }}>
                      {p.risk_level === 'critical' ? 'วิกฤต' : p.status === 'blocked' ? 'ติดปัญหา' : 'เกินกำหนด'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{p.daysSince} วัน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active Projects List */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionStyle}>5. รายการโครงการที่ยังไม่เสร็จ ({activeProjects.length} โครงการ)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, width: 20 }}>#</th>
                <th style={{ ...tableHeaderStyle, width: 60 }}>รหัส</th>
                <th style={tableHeaderStyle}>ชื่อโครงการ</th>
                <th style={{ ...tableHeaderStyle, width: 50 }}>ขนาด</th>
                <th style={{ ...tableHeaderStyle, width: 55 }}>ขั้นตอน</th>
                <th style={{ ...tableHeaderStyle, width: 55 }}>สถานะ</th>
                <th style={{ ...tableHeaderStyle, width: 35 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.slice(0, 15).map((p, i) => (
                <tr key={p.id}>
                  <td style={tableCellStyle}>{i + 1}</td>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>{p.project_code}</td>
                  <td style={tableCellStyle}>{(p.project_name || '').substring(0, 30)}</td>
                  <td style={tableCellStyle}>{p.size_kw ? `${Number(p.size_kw).toLocaleString()}` : '-'}</td>
                  <td style={tableCellStyle}>{STEP_LABELS[p.current_step] || p.current_step}</td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '1px 5px', borderRadius: 6, fontSize: 7, fontWeight: 600,
                      background: STATUS_COLORS_BG[p.status] || '#F1F5F9',
                      color: STATUS_COLORS_TEXT[p.status] || '#475569',
                    }}>{STATUS_LABELS[p.status] || p.status}</span>
                  </td>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>{p.progress || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeProjects.length > 15 && (
            <div style={{ textAlign: 'center', fontSize: 8, color: '#94a3b8', marginTop: 4 }}>
              แสดง 15 จาก {activeProjects.length} โครงการ
            </div>
          )}
        </div>

        {/* ===== EDITABLE SECTION ===== */}
        <div style={{ borderTop: '2px solid #1E3A5F', paddingTop: 12, marginTop: 8 }}>

          {/* Summary */}
          <div style={{ marginBottom: 10 }}>
            <div style={sectionStyle}>6. บทนำ (Summary)</div>
            <textarea value={draft.summary} onChange={e => handleDraftChange('summary', e.target.value)}
              style={{ width: '100%', minHeight: 60, padding: 8, border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
              placeholder="เขียนบทนำสรุปสถานการณ์..." />
          </div>

          {/* Analysis */}
          <div style={{ marginBottom: 10 }}>
            <div style={sectionStyle}>7. วิเคราะห์สถานการณ์ (Analysis)</div>
            <textarea value={draft.analysis} onChange={e => handleDraftChange('analysis', e.target.value)}
              style={{ width: '100%', minHeight: 60, padding: 8, border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
              placeholder="วิเคราะห์ปัญหาและสถานการณ์..." />
          </div>

          {/* Recommendations */}
          <div style={{ marginBottom: 10 }}>
            <div style={sectionStyle}>8. ข้อเสนอแนะ (Recommendations)</div>
            <textarea value={draft.recommendations} onChange={e => handleDraftChange('recommendations', e.target.value)}
              style={{ width: '100%', minHeight: 60, padding: 8, border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
              placeholder="ข้อเสนอแนะเชิงนโยบาย..." />
          </div>

          {/* Action Items */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={sectionStyle}>9. แผนปฏิบัติการ (Action Items)</div>
              <button onClick={addActionItem} className="no-print" style={{ fontSize: 8, padding: '4px 8px', borderRadius: 6, background: '#1E3A5F', color: 'white', border: 'none', cursor: 'pointer' }}>+ เพิ่ม</button>
            </div>
            {draft.action_items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 10, color: '#94a3b8', fontSize: 8, background: '#F8FAFC', borderRadius: 6 }}>ยังไม่มีรายการ กด "+ เพิ่ม" เพื่อเริ่ม</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, width: 20 }}>#</th>
                    <th style={tableHeaderStyle}>กิจกรรม</th>
                    <th style={{ ...tableHeaderStyle, width: 80 }}>ผู้รับผิดชอบ</th>
                    <th style={{ ...tableHeaderStyle, width: 80 }}>กำหนดเสร็จ</th>
                    <th style={{ ...tableHeaderStyle, width: 30 }} className="no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.action_items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0' }}>{i + 1}</td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0' }}>
                        <input value={item.activity} onChange={e => handleActionItemChange(i, 'activity', e.target.value)}
                          style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '3px 5px', fontSize: 8 }} placeholder="กิจกรรม" />
                      </td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0' }}>
                        <input value={item.responsible} onChange={e => handleActionItemChange(i, 'responsible', e.target.value)}
                          style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '3px 5px', fontSize: 8 }} placeholder="ผู้รับผิดชอบ" />
                      </td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0' }}>
                        <input type="date" value={item.due_date} onChange={e => handleActionItemChange(i, 'due_date', e.target.value)}
                          style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '3px 5px', fontSize: 8 }} />
                      </td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }} className="no-print">
                        <button onClick={() => removeActionItem(i)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Custom Sections */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={sectionStyle}>10. หัวข้อเพิ่มเติม (Custom Sections)</div>
              <button onClick={addCustomSection} className="no-print" style={{ fontSize: 8, padding: '4px 8px', borderRadius: 6, background: '#1E3A5F', color: 'white', border: 'none', cursor: 'pointer' }}>+ เพิ่มหัวข้อ</button>
            </div>
            {draft.custom_sections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 10, color: '#94a3b8', fontSize: 8, background: '#F8FAFC', borderRadius: 6 }}>ยังไม่มีหัวข้อเพิ่มเติม กด "+ เพิ่มหัวข้อ" เพื่อเริ่ม</div>
            ) : (
              draft.custom_sections.map((section, i) => (
                <div key={i} style={{ marginBottom: 8, padding: 8, background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                  <div className="no-print" style={{ textAlign: 'right', marginBottom: 4 }}>
                    <button onClick={() => removeCustomSection(i)} style={{ fontSize: 8, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>ลบหัวข้อนี้</button>
                  </div>
                  <input value={section.title} onChange={e => handleCustomSectionChange(i, 'title', e.target.value)}
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '4px 6px', fontSize: 9, fontWeight: 600, marginBottom: 4 }}
                    placeholder="ชื่อหัวข้อ..." />
                  <textarea value={section.content} onChange={e => handleCustomSectionChange(i, 'content', e.target.value)}
                    style={{ width: '100%', minHeight: 50, padding: 6, border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
                    placeholder="เนื้อหา..." />
                </div>
              ))
            )}
          </div>

          {/* Comments */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={sectionStyle}>11. ความคิดเห็น (Comments)</div>
              <button onClick={addComment} className="no-print" style={{ fontSize: 8, padding: '4px 8px', borderRadius: 6, background: '#1E3A5F', color: 'white', border: 'none', cursor: 'pointer' }}>+ เพิ่มความคิดเห็น</button>
            </div>
            {draft.comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 10, color: '#94a3b8', fontSize: 8, background: '#F8FAFC', borderRadius: 6 }}>ยังไม่มีความคิดเห็น</div>
            ) : (
              draft.comments.map((comment, i) => (
                <div key={i} style={{ marginBottom: 8, padding: 8, background: '#FFFBEB', borderRadius: 6, border: '1px solid #FEF3C7' }}>
                  <div className="no-print" style={{ textAlign: 'right', marginBottom: 4 }}>
                    <button onClick={() => removeComment(i)} style={{ fontSize: 8, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>ลบ</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <input value={comment.author} onChange={e => handleCommentChange(i, 'author', e.target.value)}
                      style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 4, padding: '3px 5px', fontSize: 8 }}
                      placeholder="ชื่อผู้แสดงความคิดเห็น..." />
                    <input type="date" value={comment.date} onChange={e => handleCommentChange(i, 'date', e.target.value)}
                      style={{ border: '1px solid #E2E8F0', borderRadius: 4, padding: '3px 5px', fontSize: 8 }} />
                  </div>
                  <textarea value={comment.content} onChange={e => handleCommentChange(i, 'content', e.target.value)}
                    style={{ width: '100%', minHeight: 40, padding: 6, border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
                    placeholder="ความคิดเห็น..." />
                </div>
              ))
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <div style={sectionStyle}>12. หมายเหตุ (Notes)</div>
            <textarea value={draft.notes} onChange={e => handleDraftChange('notes', e.target.value)}
              style={{ width: '100%', minHeight: 40, padding: 8, border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 9, lineHeight: 1.5, resize: 'vertical' }}
              placeholder="หมายเหตุเพิ่มเติม..." />
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 12, paddingTop: 10, borderTop: '2px solid #1E3A5F' }}>
            <div>
              <div style={{ fontSize: 9, color: '#757575' }}><strong>ผู้จัดทำ:</strong></div>
              <input value={draft.prepared_by} onChange={e => handleDraftChange('prepared_by', e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #424242', padding: '4px 0', fontSize: 9, marginTop: 30 }} placeholder="ชื่อ-นามสกุล" />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#757575' }}><strong>ผู้อนุมัติ:</strong></div>
              <input value={draft.approved_by} onChange={e => handleDraftChange('approved_by', e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #424242', padding: '4px 0', fontSize: 9, marginTop: 30 }} placeholder="ชื่อ-นามสกุล" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
