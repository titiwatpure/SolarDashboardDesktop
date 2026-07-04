import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

export default function DocReviewCorrectionReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, [id]);

  const loadReport = async () => {
    try {
      const data = await documentReviewAPI.getCorrectionReport(id);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Correction Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Project: ${report.project_code} - ${report.project_name}`, 14, 30);
    doc.text(`Package: ${report.package_name}`, 14, 36);
    doc.text(`Date: ${report.created_at}`, 14, 42);

    const rows = (report.issue_details || []).map((issue, i) => [
      i + 1,
      issue.document_name || '-',
      issue.issue_source === 'agency' ? 'Agency' : 'Internal',
      issue.description,
      issue.required_action || '-',
      issue.status === 'open' ? 'Open' : 'Resolved',
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Document', 'Source', 'Issue', 'Action Required', 'Status']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] },
    });

    doc.save(`correction-report-${report.project_code}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">กำลังโหลด...</p></div>;
  if (!report) return <div className="flex items-center justify-center py-20"><p className="text-red-500">ไม่พบรายงาน</p></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:text-blue-700 mb-3">← กลับ</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">รายงานแก้ไขเอกสาร</h1>
            <p className="text-slate-500 mt-1">{report.project_code} | {report.package_name}</p>
            <p className="text-xs text-slate-400 mt-1">สร้างเมื่อ: {report.created_at} โดย {report.created_by_name || 'system'}</p>
          </div>
          <button onClick={exportPDF} className="px-5 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">
            Export PDF
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">รายการปัญหา ({(report.issue_details || []).length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {(report.issue_details || []).length === 0 ? (
            <div className="p-6 text-center text-slate-400">ไม่มีรายการปัญหา</div>
          ) : (report.issue_details || []).map((issue, idx) => (
            <div key={issue.id} className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-slate-900">#{idx + 1}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${issue.issue_source === 'agency' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                  {issue.issue_source === 'agency' ? 'จากหน่วยงาน' : 'ตรวจสอบภายใน'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${issue.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {issue.status === 'open' ? 'ยังไม่แก้' : 'แก้แล้ว'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700">เอกสาร: {issue.document_name || 'ไม่ระบุ'}</p>
              <p className="text-sm text-slate-600 mt-1">ปัญหา: {issue.description}</p>
              {issue.required_action && <p className="text-xs text-blue-600 mt-1">ต้องทำ: {issue.required_action}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
