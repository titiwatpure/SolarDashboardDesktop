/**
 * DocReviewDashboard - แดชบอร์ดสรุปสถานะเอกสาร
 * Source of truth: submission_packages.package_status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI, projectsAPI } from '../utils/api';
import { SERVICE_TYPES } from '../utils/constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SARABUN_BASE64 } from '../utils/thaiFont';

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
  const [permitData, setPermitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, permitRes] = await Promise.all([
        documentReviewAPI.getReviewSummary(),
        projectsAPI.getPermitSummary().catch(() => null),
      ]);
      setSummary(summaryRes);
      setPermitData(permitRes);

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

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map(pkg => ({
      'รหัสโครงการ': pkg.project_code,
      'ชื่อโครงการ': pkg.project_name,
      'ชุดเอกสาร': pkg.package_name,
      'หน่วยงาน': pkg.agency || '-',
      'ลูกค้า': pkg.customer_name || '-',
      'สถานะ': UNIFIED_STATUSES[pkg.package_status]?.label || pkg.package_status,
      'ความคืบหน้า': pkg.required_total > 0 ? Math.round((pkg.required_passed / pkg.required_total) * 100) : 0,
      'กำหนดส่ง': pkg.due_date || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doc Review Summary');
    XLSX.writeFile(wb, `DocReview_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'bold');
    doc.setFont('Sarabun');

    const w = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(16);
    doc.text('รายงานสรุปสถานะเอกสาร', w / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, w / 2, y, { align: 'center' });
    y += 10;

    // Summary
    doc.setFontSize(12);
    doc.text('สรุปสถานะ', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['สถานะ', 'จำนวน']],
      body: Object.entries(UNIFIED_STATUSES).map(([key, { label }]) => [
        label,
        String(filtered.filter(p => p.package_status === key).length)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Project Details
    if (y > 200) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text('รายละเอียดชุดเอกสาร', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['รหัส', 'ชุดเอกสาร', 'หน่วยงาน', 'สถานะ', 'คืบหน้า']],
      body: filtered.map(p => [
        p.project_code,
        p.package_name,
        p.agency || '-',
        UNIFIED_STATUSES[p.package_status]?.label || p.package_status,
        `${p.required_passed || 0}/${p.required_total || 0}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 8 },
    });

    doc.save(`DocReview_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['รหัสโครงการ', 'ชื่อโครงการ', 'ชุดเอกสาร', 'หน่วยงาน', 'ลูกค้า', 'สถานะ', 'ความคืบหน้า', 'กำหนดส่ง'];
    const rows = filtered.map(pkg => [
      pkg.project_code,
      pkg.project_name,
      pkg.package_name,
      pkg.agency || '-',
      pkg.customer_name || '-',
      UNIFIED_STATUSES[pkg.package_status]?.label || pkg.package_status,
      pkg.required_total > 0 ? Math.round((pkg.required_passed / pkg.required_total) * 100) : 0,
      pkg.due_date || '-',
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DocReview_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414a1 1 0 00-.707-.293H5a2 2 0 00-2 2v11a2 2 0 002 2z"></path></svg>
              PDF
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              CSV
            </button>
            <button
              onClick={() => navigate('/doc-review/permit-tracking')}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 shadow-sm transition hover:bg-violet-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              สถานะใบอนุญาต
            </button>
            <button
              onClick={() => navigate('/doc-review/new')}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + สร้างโครงการใหม่
            </button>
          </div>
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

      {/* Permit Summary */}
      {permitData && (
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">สรุปสถานะใบอนุญาต</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Permit Type Summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">แยกตามประเภทใบอนุญาต</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-slate-600">จดแจ้งยกเว้น</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.permitSummary?.exemption || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-violet-500"></div>
                    <span className="text-sm text-slate-600">ขอใบอนุญาต</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.permitSummary?.permit || 0}</span>
                </div>
              </div>
            </div>

            {/* Service Type Summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">แยกตามประเภทบริการ</h3>
              <div className="space-y-3">
                {Object.entries(SERVICE_TYPES).map(([key, { label, icon }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-sm text-slate-600">{label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{permitData.serviceSummary?.[key] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">แยกตามสถานะโครงการ</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-slate-600">กำลังดำเนินการ</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.statusSummary?.in_progress || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-sm text-slate-600">เสร็จสิ้น</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.statusSummary?.completed || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-sm text-slate-600">รอตรวจสอบ</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.statusSummary?.waiting || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-sm text-slate-600">ติดปัญหา</span>
                  </div>
                  <span className="font-semibold text-slate-900">{permitData.statusSummary?.blocked || 0}</span>
                </div>
              </div>
            </div>
          </div>
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
                    <td className="px-6 py-4">
                      <p className="font-medium text-blue-600">{pkg.project_code}</p>
                      <p className="text-xs text-slate-500">{pkg.project_name || '-'}</p>
                    </td>
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
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pkg.required_total > 0 ? Math.round((pkg.required_passed / pkg.required_total) * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pkg.required_passed || 0}/{pkg.required_total || 0}</span>
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
