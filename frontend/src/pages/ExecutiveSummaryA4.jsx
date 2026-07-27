import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, documentReviewAPI, reportsAPI } from '../utils/api';
import { STEP_LABELS, STATUS_LABELS } from '../utils/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STEP_ORDER = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

export default function ExecutiveSummaryA4() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [kpis, setKpis] = useState({});
  const [stepStats, setStepStats] = useState({});
  const [docStats, setDocStats] = useState({ pending: 0, ready: 0, issues: 0 });
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [projectsRes, kpisRes, stepRes, pendingRes, readyRes, issuesRes] = await Promise.all([
        projectsAPI.getAll({ limit: 200 }),
        projectsAPI.getKPIs(),
        reportsAPI.getSummaryByStepStatus(),
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

  const stepSummary = useMemo(() => {
    return STEP_ORDER.map(step => {
      const s = stepStats[step] || { total: 0, completed: 0 };
      return { step, label: STEP_LABELS[step] || step, ...s };
    });
  }, [stepStats]);

  const totalProjects = kpis.total_projects || projects.length;
  const maxStepCount = Math.max(...stepSummary.map(s => s.total), 1);
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
      pdf.save(`executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
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
      <div className="mx-auto mb-4 flex justify-between items-center" style={{ maxWidth: '210mm' }}>
        <button onClick={() => navigate('/executive-report')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          กลับ
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? (
            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>กำลังส่งออก...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>ส่งออก PDF</>
          )}
        </button>
      </div>

      {/* A4 Report */}
      <div ref={reportRef} className="mx-auto bg-white shadow-lg" style={{ maxWidth: '210mm', minHeight: '297mm', padding: '12mm 15mm' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '3px solid #1E3A5F', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1E3A5F', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>S</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>รายงานสรุปโครงการ Solar</div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>Executive Summary Report</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
            อัปเดต: {now}<br />
            รอบรายงาน: รายสัปดาห์
          </div>
        </div>

        {/* KPI Summary */}
        <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>ภาพรวมโครงการ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { num: totalProjects, label: 'ทั้งหมด', color: '#1E3A5F', bg: '#EFF6FF' },
            { num: kpis.exemption || 0, label: 'ยกเว้น', color: '#059669', bg: '#ECFDF5' },
            { num: kpis.permit || 0, label: 'ขออนุญาต', color: '#D97706', bg: '#FFFBEB' },
            { num: kpis.in_progress || 0, label: 'กำลังทำ', color: '#3b82f6', bg: '#EFF6FF' },
            { num: kpis.blocked || 0, label: 'ติดปัญหา', color: '#DC2626', bg: '#FEF2F2' },
            { num: kpis.completed || 0, label: 'เสร็จแล้ว', color: '#059669', bg: '#ECFDF5' },
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: kpi.bg, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.num}</div>
              <div style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>สถานะตามขั้นตอน</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
          {stepSummary.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, background: s.total > 0 ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.blocked > 0 ? '#DC2626' : s.total > 0 ? '#1E3A5F' : '#94a3b8' }}>{s.total}</div>
              <div style={{ fontSize: 7, color: '#475569', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action Items */}
        <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>สิ่งที่ต้องดำเนินการ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'เอกสารต้องแก้', count: docStats.pending, color: '#D97706', bg: '#FFFBEB' },
            { label: 'พร้อมส่งหน่วยงาน', count: docStats.ready, color: '#059669', bg: '#ECFDF5' },
            { label: 'ปัญหาเอกสาร', count: docStats.issues, color: '#DC2626', bg: '#FEF2F2' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 6, borderRadius: 8, background: item.bg, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.count}</div>
              <div style={{ fontSize: 8, color: '#475569' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Attention Projects Table */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>โครงการต้องติดตาม</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
            <thead>
              <tr>
                <th style={{ background: '#F1F5F9', padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 60 }}>รหัส</th>
                <th style={{ background: '#F1F5F9', padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0' }}>ชื่อโครงการ</th>
                <th style={{ background: '#F1F5F9', padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 55 }}>ขั้นตอน</th>
                <th style={{ background: '#F1F5F9', padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 60 }}>สถานะ</th>
                <th style={{ background: '#F1F5F9', padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #E2E8F0', width: 40 }}>วัน</th>
              </tr>
            </thead>
            <tbody>
              {attentionProjects.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 8, textAlign: 'center', color: '#94a3b8' }}>ไม่มีโครงการที่ต้องติดตาม</td></tr>
              ) : attentionProjects.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>{p.project_code}</td>
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #E2E8F0' }}>{(p.project_name || '').substring(0, 30)}</td>
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #E2E8F0' }}>{STEP_LABELS[p.current_step] || p.current_step}</td>
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 8, fontSize: 7, fontWeight: 600,
                      background: p.risk_level === 'critical' ? '#FEE2E2' : p.status === 'blocked' ? '#FEE2E2' : '#FEF3C7',
                      color: p.risk_level === 'critical' ? '#DC2626' : p.status === 'blocked' ? '#DC2626' : '#D97706',
                    }}>
                      {p.risk_level === 'critical' ? 'วิกฤต' : p.status === 'blocked' ? 'ติดปัญหา' : 'เกินกำหนด'}
                    </span>
                  </td>
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #E2E8F0' }}>{p.daysSince} วัน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary & Recommendations */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>สรุปและข้อเสนอแนะ</div>
          <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.5, marginBottom: 6 }}>
            ปัจจุบันมีโครงการทั้งหมด <strong style={{ color: '#0F172A' }}>{totalProjects} โครงการ</strong>
            {kpis.blocked > 0 && <>, ติดปัญหา <strong style={{ color: '#DC2626' }}>{kpis.blocked} โครงการ</strong></>}
            {kpis.critical_risk > 0 && <> และมีความเสี่ยงวิกฤต <strong style={{ color: '#DC2626' }}>{kpis.critical_risk} โครงการ</strong></>}
            .
          </div>
          <div style={{ fontSize: 9, color: '#0F172A', lineHeight: 1.5 }}>
            <strong style={{ color: '#1E3A5F' }}>ข้อเสนอแนะ:</strong>{' '}
            {kpis.blocked > 0 && <>1. เร่งแก้ปัญหา {kpis.blocked} โครงการ{' '}</>}
            {kpis.critical_risk > 0 && <>2. ติดตามโครงการวิกฤตอย่างใกล้ชิด{' '}</>}
            {docStats.pending > 0 && <>3. ส่งเอกสาร {docStats.pending} รายการกลับให้ลูกค้า</>}
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 8, color: '#94a3b8' }}>
            รายงานนี้จัดทำขึ้นโดยระบบ Solar Dashboard
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderBottom: '1px solid #0F172A', marginBottom: 4 }}></div>
              <div style={{ fontSize: 8, color: '#475569' }}>ผู้จัดทำ</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderBottom: '1px solid #0F172A', marginBottom: 4 }}></div>
              <div style={{ fontSize: 8, color: '#475569' }}>ผู้อนุมัติ</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
