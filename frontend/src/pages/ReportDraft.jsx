import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportDraftsAPI, projectsAPI, documentReviewAPI, reportsAPI } from '../utils/api';
import { STEP_LABELS, STATUS_LABELS } from '../utils/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

export default function ReportDraft() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState({
    title: 'รายงานผู้บริหาร',
    report_date: new Date().toISOString().slice(0, 10),
    version: '1.0',
    status: 'draft',
    summary: '',
    analysis: '',
    recommendations: '',
    notes: '',
    prepared_by: '',
    approved_by: '',
    reviewed_by: '',
    action_items: [],
  });

  // Auto data from DB
  const [autoData, setAutoData] = useState({ kpis: {}, projects: [], stepStats: {}, docStats: {} });
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isNew) loadDraft();
    loadAutoData();
  }, [id]);

  const loadDraft = async () => {
    try {
      const data = await reportDraftsAPI.getById(id);
      setReportData({
        ...data,
        action_items: Array.isArray(data.action_items) ? data.action_items : [],
      });
    } catch (err) {
      console.error('Failed to load draft:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAutoData = async () => {
    try {
      const [projectsRes, kpisRes, stepRes, pendingRes, readyRes, issuesRes] = await Promise.all([
        projectsAPI.getAll({ limit: 200 }),
        projectsAPI.getKPIs(),
        reportsAPI.getSummaryByStepStatus(),
        documentReviewAPI.getPendingRevisions().catch(() => []),
        documentReviewAPI.getReadyToSubmit().catch(() => []),
        documentReviewAPI.getOpenIssues().catch(() => []),
      ]);

      const projects = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
      const stepData = Array.isArray(stepRes) ? stepRes : (stepRes?.data || []);
      const stats = {};
      STEP_ORDER.forEach(step => { stats[step] = 0; });
      stepData.forEach(row => { if (stats[row.step] !== undefined) stats[row.step] += row.count || 0; });

      setAutoData({
        kpis: kpisRes || {},
        projects,
        stepStats: stats,
        docStats: {
          pending: Array.isArray(pendingRes) ? pendingRes.length : 0,
          ready: Array.isArray(readyRes) ? readyRes.length : 0,
          issues: Array.isArray(issuesRes) ? issuesRes.length : 0,
        },
      });
    } catch (err) {
      console.error('Failed to load auto data:', err);
    }
  };

  const handleChange = (field, value) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const handleActionItemChange = (index, field, value) => {
    const newItems = [...reportData.action_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setReportData(prev => ({ ...prev, action_items: newItems }));
  };

  const addActionItem = () => {
    setReportData(prev => ({
      ...prev,
      action_items: [...prev.action_items, { activity: '', responsible: '', due_date: '', status: 'pending', note: '' }],
    }));
  };

  const removeActionItem = (index) => {
    setReportData(prev => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    try {
      const payload = { ...reportData, status };
      if (isNew) {
        const result = await reportDraftsAPI.create(payload);
        navigate(`/report-draft/${result.id}`, { replace: true });
      } else {
        await reportDraftsAPI.update(id, payload);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

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
      pdf.save(`report-${reportData.report_date}-${reportData.version}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  const totalProjects = autoData.kpis.total_projects || autoData.projects.length;
  const now = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Action Bar */}
      <div className="mx-auto mb-4 flex justify-between items-center" style={{ maxWidth: '210mm' }}>
        <button onClick={() => navigate('/executive-report')} className="text-sm text-blue-600 hover:text-blue-700">← กลับ</button>
        <div className="flex gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'บันทึก Draft'}
          </button>
          <button onClick={() => handleSave('final')} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            บันทึกและ finalized
          </button>
          <button onClick={handleExportPDF} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก PDF'}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="mx-auto bg-white shadow-lg" style={{ maxWidth: '210mm', padding: '15mm' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '3px solid #1E40AF', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: '#1E40AF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>S</div>
            <div>
              <input value={reportData.title} onChange={e => handleChange('title', e.target.value)}
                style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', border: 'none', background: 'transparent', width: '100%' }}
                placeholder="ชื่อรายงาน" />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Solar Dashboard — Executive Report</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>
            <div>วันที่: <input type="date" value={reportData.report_date} onChange={e => handleChange('report_date', e.target.value)}
              style={{ border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10 }} /></div>
            <div>เวอร์ชัน: <input value={reportData.version} onChange={e => handleChange('version', e.target.value)}
              style={{ border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10, width: 40 }} /></div>
          </div>
        </div>

        {/* Auto KPI Summary */}
        <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>ภาพรวมโครงการ (อัตโนมัติ)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16, padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
          {[
            { num: totalProjects, label: 'โครงการทั้งหมด', color: '#1E40AF' },
            { num: autoData.kpis.completed || 0, label: 'เสร็จสิ้น', color: '#059669' },
            { num: autoData.kpis.blocked || 0, label: 'ติดปัญหา', color: '#DC2626' },
            { num: autoData.kpis.critical_risk || 0, label: 'ความเสี่ยงวิกฤต', color: '#DC2626' },
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 8, borderRadius: 6, background: 'white', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.num}</div>
              <div style={{ fontSize: 8, color: '#475569' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Editable Sections */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>1. บทนำ (Summary)</div>
          <textarea value={reportData.summary} onChange={e => handleChange('summary', e.target.value)}
            style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10, lineHeight: 1.6, resize: 'vertical' }}
            placeholder="เขียนบทนำสรุปสถานการณ์..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>2. วิเคราะห์สถานการณ์ (Analysis)</div>
          <textarea value={reportData.analysis} onChange={e => handleChange('analysis', e.target.value)}
            style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10, lineHeight: 1.6, resize: 'vertical' }}
            placeholder="วิเคราะห์ปัญหาและสถานการณ์..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>3. ข้อเสนอแนะ (Recommendations)</div>
          <textarea value={reportData.recommendations} onChange={e => handleChange('recommendations', e.target.value)}
            style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10, lineHeight: 1.6, resize: 'vertical' }}
            placeholder="ข้อเสนอแนะเชิงนโยบาย..." />
        </div>

        {/* Action Items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. แผนปฏิบัติการ (Action Items)</div>
            <button onClick={addActionItem} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 6, background: '#1E40AF', color: 'white', border: 'none', cursor: 'pointer' }}>+ เพิ่มรายการ</button>
          </div>
          {reportData.action_items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8', fontSize: 9, background: '#F8FAFC', borderRadius: 8 }}>ยังไม่มีรายการ กด "+ เพิ่มรายการ" เพื่อเริ่ม</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 30 }}>#</th>
                  <th style={{ background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0' }}>กิจกรรม</th>
                  <th style={{ background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 100 }}>ผู้รับผิดชอบ</th>
                  <th style={{ background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 90 }}>กำหนดเสร็จ</th>
                  <th style={{ background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {reportData.action_items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0' }}>{i + 1}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0' }}>
                      <input value={item.activity} onChange={e => handleActionItemChange(i, 'activity', e.target.value)}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '4px 6px', fontSize: 9 }} placeholder="กิจกรรม" />
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0' }}>
                      <input value={item.responsible} onChange={e => handleActionItemChange(i, 'responsible', e.target.value)}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '4px 6px', fontSize: 9 }} placeholder="ผู้รับผิดชอบ" />
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0' }}>
                      <input type="date" value={item.due_date} onChange={e => handleActionItemChange(i, 'due_date', e.target.value)}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '4px 6px', fontSize: 9 }} />
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <button onClick={() => removeActionItem(i)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>5. หมายเหตุ (Notes)</div>
          <textarea value={reportData.notes} onChange={e => handleChange('notes', e.target.value)}
            style={{ width: '100%', minHeight: 60, padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10, lineHeight: 1.6, resize: 'vertical' }}
            placeholder="หมายเหตุเพิ่มเติม..." />
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '2px solid #1E40AF' }}>
          {[
            { label: 'ผู้จัดทำ', field: 'prepared_by' },
            { label: 'ผู้ตรวจสอบ', field: 'reviewed_by' },
            { label: 'ผู้อนุมัติ', field: 'approved_by' },
          ].map((sig, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: '#757575' }}><strong>{sig.label}:</strong></div>
              <input value={reportData[sig.field]} onChange={e => handleChange(sig.field, e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #424242', padding: '4px 0', fontSize: 10, marginTop: 30 }} placeholder="ชื่อ-นามสกุล" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
