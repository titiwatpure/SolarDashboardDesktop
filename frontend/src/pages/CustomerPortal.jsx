import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Zap, FileText, Shield, Download } from 'lucide-react';
import { portalAPI, documentsAPI } from '../utils/api';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STEP_LABELS,
  QUOTATION_STATUSES,
  CONTRACT_STATUSES,
  DOCUMENT_TYPES,
} from '../utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value) => {
  if (value == null || value === '') return '-';
  return Number(value).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const documentTypeColors = {
  sld: 'bg-blue-50 text-blue-700',
  permit: 'bg-amber-50 text-amber-700',
  test_report: 'bg-emerald-50 text-emerald-700',
  other: 'bg-slate-100 text-slate-700',
};

const getProgressColor = (progress) => {
  if (progress >= 100) return 'bg-emerald-500';
  if (progress >= 60) return 'bg-blue-500';
  if (progress >= 30) return 'bg-amber-500';
  return 'bg-slate-400';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomerPortal() {
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Data loading -------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, projectsData, quotationsData, contractsData, documentsData] =
        await Promise.all([
          portalAPI.getSummary(),
          portalAPI.getProjects(),
          portalAPI.getQuotations(),
          portalAPI.getContracts(),
          portalAPI.getDocuments(),
        ]);

      setSummary(summaryData);
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData?.data || []);
      setQuotations(Array.isArray(quotationsData) ? quotationsData : quotationsData?.data || []);
      setContracts(Array.isArray(contractsData) ? contractsData : contractsData?.data || []);
      setDocuments(Array.isArray(documentsData) ? documentsData : documentsData?.data || []);
    } catch (err) {
      console.error('Failed to load portal data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- KPI configuration --------------------------------------------------

  const kpiCards = [
    {
      key: 'projects',
      label: 'จำนวนโครงการ',
      value: summary?.total_projects ?? projects.length,
      icon: Zap,
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      key: 'quotations',
      label: 'ใบเสนอราคา',
      value: summary?.total_quotations ?? quotations.length,
      icon: FileText,
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      key: 'contracts',
      label: 'สัญญา',
      value: summary?.total_contracts ?? contracts.length,
      icon: Shield,
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      key: 'documents',
      label: 'เอกสาร',
      value: summary?.total_documents ?? documents.length,
      icon: Download,
      iconBg: 'bg-purple-100 text-purple-600',
    },
  ];

  // ---- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // ---- Error state --------------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6 bg-slate-50/80">
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              แดชบอร์ดลูกค้า
            </h1>
            <p className="mt-2 text-base text-slate-500">
              ข้อมูลโครงการและเอกสารของคุณ
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* KPI Summary                                                        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                    {Number(card.value || 0)}
                  </p>
                </div>
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBg}`}
                >
                  <Icon size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* Projects                                                           */}
      {/* ================================================================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">โครงการของคุณ</h2>
          <p className="mt-1 text-sm text-slate-500">
            รายการโครงการทั้งหมดที่เกี่ยวข้องกับคุณ
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">รหัสโครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">ชื่อโครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">ขั้นตอน</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-left font-semibold">ความคืบหน้า</th>
                <th className="px-5 py-4 text-left font-semibold">จังหวัด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {project.project_code}
                    </td>
                    <td className="px-5 py-4 text-slate-900">{project.project_name}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        {STEP_LABELS[project.current_step] || project.current_step || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {STATUS_LABELS[project.status] || project.status || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              project.progress
                            )}`}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-9 text-right">
                          {project.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{project.province || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Quotations                                                         */}
      {/* ================================================================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">ใบเสนอราคา</h2>
          <p className="mt-1 text-sm text-slate-500">
            รายการใบเสนอราคาที่เกี่ยวข้องกับโครงการของคุณ
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">เลขที่</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-left font-semibold">ยอดรวม</th>
                <th className="px-5 py-4 text-left font-semibold">วันหมดอายุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                quotations.map((quotation) => {
                  const statusInfo = QUOTATION_STATUSES[quotation.status];

                  return (
                    <tr key={quotation.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {quotation.quotation_number || quotation.id}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusInfo?.color || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusInfo?.label || quotation.status || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatCurrency(quotation.total_amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(quotation.expiry_date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Contracts                                                          */}
      {/* ================================================================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">สัญญา</h2>
          <p className="mt-1 text-sm text-slate-500">
            รายการสัญญาที่เกี่ยวข้องกับโครงการของคุณ
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">เลขที่สัญญา</th>
                <th className="px-5 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-left font-semibold">มูลค่า</th>
                <th className="px-5 py-4 text-left font-semibold">วันเริ่ม - สิ้นสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const statusInfo = CONTRACT_STATUSES[contract.status];

                  return (
                    <tr key={contract.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {contract.contract_number || contract.id}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {contract.project_name || '-'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusInfo?.color || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusInfo?.label || contract.status || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatCurrency(contract.contract_value)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Documents                                                          */}
      {/* ================================================================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">เอกสาร</h2>
          <p className="mt-1 text-sm text-slate-500">
            เอกสารประกอบโครงการที่สามารถดาวน์โหลดได้
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">ชื่อเอกสาร</th>
                <th className="px-5 py-4 text-left font-semibold">ประเภท</th>
                <th className="px-5 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">ขนาดไฟล์</th>
                <th className="px-5 py-4 text-center font-semibold">ดาวน์โหลด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {doc.document_name}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          documentTypeColors[doc.document_type] || documentTypeColors.other
                        }`}
                      >
                        {DOCUMENT_TYPES[doc.document_type] || doc.document_type || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{doc.project_name || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{formatFileSize(doc.file_size)}</td>
                    <td className="px-5 py-4 text-center">
                      {doc.file_path ? (
                        <a
                          href={documentsAPI.getDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                          title="ดาวน์โหลด"
                        >
                          <Download size={14} />
                          ดาวน์โหลด
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
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
