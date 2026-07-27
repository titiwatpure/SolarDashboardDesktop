import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
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

export default function CustomerReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [specs, setSpecs] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadProject(); }, [id]);

  const loadProject = async () => {
    try {
      const data = await projectsAPI.getById(id);
      setProject(data);
      setSpecs(data?.specs || null);

      // Load timeline
      try {
        const tl = await projectsAPI.getTimeline(id);
        setTimeline(Array.isArray(tl) ? tl.slice(0, 10) : []);
      } catch { setTimeline([]); }

      // Load checkpoints
      try {
        const cp = await projectsAPI.getCheckpoints(id);
        setCheckpoints(Array.isArray(cp) ? cp : []);
      } catch { setCheckpoints([]); }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
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
      pdf.save(`customer-report-${project?.project_code || id}-${new Date().toISOString().slice(0, 10)}.pdf`);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">ไม่พบโครงการ</p>
          <button onClick={() => navigate('/projects')} className="mt-4 text-sm text-blue-600 hover:text-blue-700">← กลับไปรายการโครงการ</button>
        </div>
      </div>
    );
  }

  const progress = project.progress || 0;
  const currentStepIndex = STEP_ORDER.indexOf(project.current_step);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Export Button */}
      <div className="mx-auto mb-4 flex justify-between items-center" style={{ maxWidth: '210mm' }}>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:text-blue-700">← กลับ</button>
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

      <div ref={reportRef} className="mx-auto bg-white shadow-lg" style={{ maxWidth: '210mm', minHeight: '297mm', padding: '15mm' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '3px solid #1E40AF', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: '#1E40AF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>S</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>รายงานโครงการ</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{project.project_code} — {project.project_name}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>
            อัปเดต: {new Date(project.updated_at || project.created_at).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
          </div>
        </div>

        {/* Project Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>รหัสโครงการ</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{project.project_code}</div>
          </div>
          <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>ชื่อโครงการ</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{project.project_name}</div>
          </div>
          <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>ลูกค้า</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{project.customer_name || '-'}</div>
          </div>
        </div>

        {/* Status & Progress */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>สถานะปัจจุบัน</div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: STATUS_COLORS_BG[project.status] || '#F1F5F9',
              color: STATUS_COLORS_TEXT[project.status] || '#475569',
            }}>
              {STATUS_LABELS[project.status] || project.status}
            </div>
            <div style={{ fontSize: 9, color: '#475569', marginTop: 8 }}>ขั้นตอนปัจจุบัน</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>{STEP_LABELS[project.current_step] || project.current_step}</div>
          </div>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>ความคืบหน้า</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 20, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#059669' : progress >= 60 ? '#3b82f6' : '#D97706', borderRadius: 10, transition: 'width 0.5s' }}></div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', minWidth: 40, textAlign: 'right' }}>{progress}%</span>
            </div>
            <div style={{ fontSize: 9, color: '#475569', marginTop: 8 }}>ขนาดระบบ</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{project.size_kw ? `${Number(project.size_kw).toLocaleString()} kWp` : '-'}</div>
          </div>
        </div>

        {/* Pipeline Steps */}
        <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>ขั้นตอนการทำงาน</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {STEP_ORDER.map((step, i) => {
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isFuture = i > currentStepIndex;
            return (
              <div key={step} style={{
                flex: 1, padding: '8px 4px', borderRadius: 6, textAlign: 'center', fontSize: 8,
                background: isCompleted ? '#059669' : isCurrent ? '#3b82f6' : '#F1F5F9',
                color: isCompleted || isCurrent ? 'white' : '#94a3b8',
                fontWeight: isCurrent ? 700 : 400,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{isCompleted ? '✓' : i + 1}</div>
                <div>{STEP_LABELS[step]}</div>
              </div>
            );
          })}
        </div>

        {/* Customer Info */}
        {project.customer_name && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>ข้อมูลลูกค้า</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16, padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>ชื่อผู้ติดต่อ</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{project.customer_contact_name || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>เบอร์โทร</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{project.customer_contact_phone || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>อีเมล</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{project.customer_contact_email || '-'}</div>
              </div>
            </div>
          </>
        )}

        {/* Technical Specs */}
        {specs && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>สเปคเทคนิค</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16, padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>แผงโซลาร์</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{specs.panel_brand || '-'} {specs.panel_count ? `× ${specs.panel_count}` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>อินเวอร์เตอร์</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{specs.inverter_brand || '-'} {specs.inverter_count ? `× ${specs.inverter_count}` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>ประเภทติดตั้ง</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{specs.mounting_type || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569' }}>เชื่อมต่อสาย</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{specs.grid_connection_type || '-'}</div>
              </div>
            </div>
          </>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>ประวัติการดำเนินงาน</div>
            <div style={{ marginBottom: 16 }}>
              {timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: i < timeline.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'completed' ? '#059669' : t.status === 'in_progress' ? '#3b82f6' : '#94a3b8', marginTop: 4, flexShrink: 0 }}></div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#0F172A' }}>{STEP_LABELS[t.step] || t.step} — {STATUS_LABELS[t.status] || t.status}</div>
                    <div style={{ fontSize: 9, color: '#475569' }}>{t.description || '-'}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{new Date(t.created_at).toLocaleString('th-TH')}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Checkpoints */}
        {checkpoints.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>จุดตรวจสอบ (Checkpoints)</div>
            <div style={{ marginBottom: 16 }}>
              {checkpoints.map((cp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: i % 2 === 0 ? '#F8FAFC' : 'white', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#0F172A' }}>
                    <span style={{ fontWeight: 600 }}>{STEP_LABELS[cp.step] || cp.step}</span> — {cp.checkpoint_name}
                  </div>
                  <span style={{
                    fontSize: 8, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                    background: cp.status === 'completed' ? '#D1FAE5' : cp.status === 'failed' ? '#FEE2E2' : '#F1F5F9',
                    color: cp.status === 'completed' ? '#059669' : cp.status === 'failed' ? '#DC2626' : '#94a3b8',
                  }}>
                    {cp.status === 'completed' ? 'ผ่าน' : cp.status === 'failed' ? 'ไม่ผ่าน' : 'รอดำเนินการ'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>
            รายงานนี้แสดงสถานะปัจจุบันของโครงการ <strong style={{ color: '#0F172A' }}>{project.project_code}</strong>
            {project.status === 'completed' && <> โครงการเสร็จสิ้นแล้ว</>}
            {project.status === 'blocked' && <> โครงการกำลังติดปัญหา กรุณาติดต่อผู้รับผิดชอบ</>}
            {project.status === 'in_progress' && <> โครงการกำลังดำเนินการ ความคืบหน้า {progress}%</>}
          </div>
          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 9, color: '#475569' }}>
            <div style={{ width: 120, borderTop: '1px solid #0F172A', marginLeft: 'auto', marginTop: 30, paddingTop: 4 }}>
              ผู้จัดทำ<br />
              <span style={{ fontSize: 8 }}>วันที่: {new Date().toLocaleDateString('th-TH')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
