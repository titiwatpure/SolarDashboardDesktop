import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';
import { SARABUN_BASE64 } from '../utils/thaiFont';

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
    if (!report) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF('p', 'mm', 'a4');

    // Embed Sarabun Thai font
    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'bold');
    doc.setFont('Sarabun');

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Title
    doc.setFontSize(18);
    doc.text('รายงานแก้ไขเอกสาร', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text('(Correction Report)', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Meta info
    doc.setFontSize(11);
    doc.text(`รหัสโครงการ: ${report.project_code || '-'}`, 14, y);
    doc.text(`ชื่อโครงการ: ${report.project_name || '-'}`, pageWidth / 2 + 5, y);
    y += 6;
    doc.text(`ชุดเอกสาร: ${report.package_name || '-'}`, 14, y);
    doc.text(`สร้างเมื่อ: ${report.created_at || '-'}`, pageWidth / 2 + 5, y);
    y += 4;

    // Divider
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    // Table
    const issues = report.issue_details || [];
    const rows = issues.map((issue, i) => [
      `${i + 1}`,
      issue.document_name || '-',
      issue.issue_source === 'agency' ? 'จากหน่วยงาน' : 'ตรวจสอบภายใน',
      issue.description || '-',
      issue.required_action || '-',
      issue.status === 'open' ? 'ยังไม่แก้' : 'แก้แล้ว',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'เอกสาร', 'แหล่งที่มา', 'ปัญหาที่พบ', 'ต้องแก้ไข', 'สถานะ']],
      body: rows,
      styles: { font: 'Sarabun', fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246], font: 'Sarabun', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 35 },
        5: { cellWidth: 20 },
      },
    });

    doc.save(`รายงานแก้ไขเอกสาร-${report.project_code || 'unknown'}.pdf`);
  };

  const exportExcel = () => {
    if (!report) return;
    const issues = report.issue_details || [];

    const BOM = '\uFEFF';
    const headers = ['ลำดับ', 'เอกสาร', 'แหล่งที่มา', 'ปัญหาที่พบ', 'ต้องแก้ไข', 'สถานะ'];
    const rows = issues.map((issue, i) => [
      i + 1,
      issue.document_name || '-',
      issue.issue_source === 'agency' ? 'จากหน่วยงาน' : 'ตรวจสอบภายใน',
      issue.description || '-',
      issue.required_action || '-',
      issue.status === 'open' ? 'ยังไม่แก้' : 'แก้แล้ว',
    ]);

    const csvContent = BOM + [
      `รายงานแก้ไขเอกสาร - ${report.project_code} - ${report.project_name}`,
      `ชุดเอกสาร: ${report.package_name}`,
      `สร้างเมื่อ: ${report.created_at}`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายงานแก้ไขเอกสาร-${report.project_code || 'unknown'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">กำลังโหลด...</p></div>;
  if (!report) return <div className="flex items-center justify-center py-20"><p className="text-red-500">ไม่พบรายงาน</p></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <button onClick={() => navigate('/doc-review/agency-tracking')} className="text-sm text-blue-600 hover:text-blue-700 mb-3">← กลับไปติดตามยื่นหน่วยงาน</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">รายงานแก้ไขเอกสาร</h1>
            <p className="text-slate-500 mt-1">{report.project_code} | {report.package_name}</p>
            <p className="text-xs text-slate-400 mt-1">สร้างเมื่อ: {report.created_at} โดย {report.created_by_name || 'system'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">
              Export Excel
            </button>
            <button onClick={exportPDF} className="px-5 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">
              Export PDF
            </button>
          </div>
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
