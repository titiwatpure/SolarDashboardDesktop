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

    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'bold');
    doc.setFont('Sarabun');

    const pageWidth = doc.internal.pageSize.getWidth();
    const ml = 14;
    let y = 18;

    // Title
    doc.setFontSize(18);
    doc.setFont('Sarabun', 'bold');
    doc.text('รายงานแก้ไขเอกสาร', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('Sarabun', 'normal');
    doc.text('(Correction Report)', pageWidth / 2, y, { align: 'center' });
    y += 14;

    // Meta info — one field per line, no overlap
    doc.setFontSize(10);
    const addMetaLine = (label, value) => {
      doc.setFont('Sarabun', 'bold');
      doc.text(label, ml, y);
      doc.setFont('Sarabun', 'normal');
      const display = (value || '-').length > 55 ? (value || '-').substring(0, 55) + '...' : (value || '-');
      doc.text(display, ml + 30, y);
      y += 7;
    };

    addMetaLine('รหัสโครงการ:', report.project_code);
    addMetaLine('ชื่อโครงการ:', report.project_name);
    addMetaLine('ชุดเอกสาร:', report.package_name);
    addMetaLine('สร้างเมื่อ:', (() => {
      try { return new Date(report.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); }
      catch (e) { return report.created_at; }
    })());
    y += 3;

    // Divider
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(ml, y, pageWidth - ml, y);
    y += 6;

    // Table
    const issues = report.issue_details || [];
    const rows = issues.map((issue, i) => [
      `${i + 1}`,
      issue.document_name || '-',
      issue.issue_source === 'agency' ? 'จากหน่วยงาน' : 'ตรวจสอบภายใน',
      issue.description || '-',
      issue.required_action || '-',
      issue.reviewer_name || '-',
      issue.status === 'open' ? 'ยังไม่แก้' : 'แก้แล้ว',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: ml, right: ml },
      head: [['#', 'เอกสาร', 'แหล่งที่มา', 'ปัญหาที่พบ', 'ต้องแก้ไข', 'ผู้ตรวจ', 'สถานะ']],
      body: rows,
      styles: { font: 'Sarabun', fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [139, 92, 246], font: 'Sarabun', fontSize: 9, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 28 },
        2: { cellWidth: 20 },
        3: { cellWidth: 42 },
        4: { cellWidth: 28 },
        5: { cellWidth: 18 },
        6: { cellWidth: 16 },
      },
      didDrawPage: (data) => {
        // Footer on every page
        doc.setFontSize(8);
        doc.setFont('Sarabun', 'normal');
        doc.text(`หน้า ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, 287, { align: 'center' });
      },
    });

    // ส่วนผู้เกี่ยวข้อง (หลังตาราง)
    let personY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('Sarabun', 'bold');
    doc.text('ผู้เกี่ยวข้อง', ml, personY);
    personY += 7;

    doc.setFontSize(9);
    doc.setFont('Sarabun', 'normal');

    const addPerson = (label, name, detail) => {
      doc.setFont('Sarabun', 'bold');
      doc.text(`${label}: `, ml, personY);
      doc.setFont('Sarabun', 'normal');
      doc.text(name || '-', ml + 30, personY);
      if (detail) {
        doc.text(detail, ml + 75, personY);
      }
      personY += 6;
    };

    addPerson('ผู้สร้างรายงาน', report.created_by_name);
    if (report.latest_receipt) {
      addPerson('ผู้รับเอกสาร', report.latest_receipt.received_by_name, report.latest_receipt.received_from || '');
    }

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
            <p className="text-xs text-slate-400 mt-1">สร้างเมื่อ: {(() => { try { return new Date(report.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); } catch (e) { return report.created_at; } })()} โดย {report.created_by_name || 'system'}</p>
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

      {/* ผู้เกี่ยวข้อง */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">ผู้เกี่ยวข้อง</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-400 mb-1">ผู้สร้างรายงาน</p>
            <p className="text-sm font-semibold text-slate-900">{report.created_by_name || '-'}</p>
            <p className="text-xs text-slate-500">{(() => { try { return new Date(report.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); } catch (e) { return report.created_at; } })()}</p>
          </div>
          {report.latest_receipt && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-400 mb-1">ผู้รับเอกสารล่าสุด</p>
              <p className="text-sm font-semibold text-slate-900">{report.latest_receipt.received_by_name || '-'}</p>
              <p className="text-xs text-slate-500">{report.latest_receipt.received_from || ''} ({report.latest_receipt.received_channel || '-'})</p>
            </div>
          )}
        </div>
      </section>

      {/* รายการปัญหา */}
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
