/**
 * DocReviewDetail - รายละเอียดโครงการยื่นเอกสาร
 * รองรับ 1 โครงการมีหลายชุดเอกสาร (Packages)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const STATUS_LABELS = {
  waiting_documents: 'รอเอกสาร',
  internal_review: 'กำลังตรวจ',
  customer_revision: 'รอลูกค้าแก้',
  ready_to_submit: 'พร้อมยื่น',
  submitted_agency: 'ยื่นแล้ว',
  agency_revision: 'หน่วยงานให้แก้',
  approved: 'อนุมัติแล้ว',
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

const CHECKLIST_STATUS = {
  pending: { label: 'รอตรวจ', color: 'bg-slate-100 text-slate-600' },
  checking: { label: 'กำลังตรวจ', color: 'bg-blue-100 text-blue-700' },
  customer_revision: { label: 'ส่งกลับแก้ไข', color: 'bg-orange-100 text-orange-700' },
  passed: { label: 'ผ่านแล้ว', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'ไม่ผ่าน', color: 'bg-red-100 text-red-700' }
};

const PERMIT_TYPES = {
  pck2: 'พค.2 ใบอนุญาตผลิตพลังงานควบคุม',
  a1: 'อ.1 ขออนุญาตก่อสร้าง',
  rong4: 'รง.4 แจ้งประกอบกิจการ',
  erc: 'อนุมัติ กกพ.',
  sld: 'SLD ผังระบบไฟฟ้า'
};

const TEMPLATE_OPTIONS = [
  { id: 'tpl-permit-pck2', name: 'พค.2 ใบอนุญาตผลิตพลังงานควบคุม', count: 12 },
  { id: 'tpl-permit-a1', name: 'อ.1 ขออนุญาตก่อสร้าง', count: 10 },
  { id: 'tpl-permit-rong4', name: 'รง.4 แจ้งประกอบกิจการ', count: 7 },
  { id: 'tpl-permit-erc', name: 'อนุมัติ กกพ.', count: 10 },
  { id: 'tpl-permit-sld-pea', name: 'SLD ผังระบบไฟฟ้า (PEA)', count: 7 },
  { id: 'tpl-permit-sld-mea', name: 'SLD ผังระบบไฟฟ้า (MEA)', count: 8 },
  { id: 'tpl-permit-cop', name: 'COP ประมวลหลักการปฏิบัติ', count: 6 },
  { id: 'tpl-renewal', name: 'ขอต่ออายุใบอนุญาต', count: 5 },
];

export default function DocReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showSummaryMatrix, setShowSummaryMatrix] = useState(true);
  const [packageDetails, setPackageDetails] = useState({});

  useEffect(() => { loadProject(); }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const [projData, pkgData] = await Promise.all([
        documentReviewAPI.getReviewProject(id),
        documentReviewAPI.getPackages(id)
      ]);
      setProject(projData);
      setPackages(Array.isArray(pkgData) ? pkgData : []);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageDetail = async (packageId) => {
    try {
      const data = await documentReviewAPI.getPackage(packageId);
      setSelectedPackage(data);
    } catch (error) {
      console.error('Failed to load package:', error);
    }
  };

  const loadAllPackageDetails = async () => {
    const details = {};
    for (const pkg of packages) {
      try {
        const data = await documentReviewAPI.getPackage(pkg.id);
        details[pkg.id] = data;
      } catch (error) {
        console.error('Failed to load package:', pkg.id, error);
      }
    }
    setPackageDetails(details);
  };

  useEffect(() => {
    if (packages.length > 0 && showSummaryMatrix) {
      loadAllPackageDetails();
    }
  }, [packages, showSummaryMatrix]);

  const handleDeletePackage = async (packageId, packageName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`ต้องการลบชุดเอกสาร "${packageName}" พร้อมรายการทั้งหมดหรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    try {
      await documentReviewAPI.deletePackage(packageId);
      if (selectedPackage?.id === packageId) setSelectedPackage(null);
      loadProject();
    } catch (error) {
      console.error('Failed to delete package:', error);
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleDeleteProject = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`ต้องการลบโครงการ "${project.project_code} - ${project.project_name}" พร้อมข้อมูลทั้งหมด (${packages.length} ชุดเอกสาร) หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    try {
      await documentReviewAPI.deleteReviewProject(id);
      navigate('/doc-review');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('ลบไม่สำเร็จ');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">กำลังโหลด...</p></div>;
  if (!project) return <div className="flex items-center justify-center py-20"><p className="text-red-500">ไม่พบโครงการ</p></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <a href="/doc-review" className="hover:text-blue-600">ระบบตรวจเอกสาร</a>
              <span>/</span>
              <span className="text-slate-900 font-medium">{project.project_code}</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900">{project.project_name}</h1>
            <p className="text-slate-500 mt-1">{project.customer_name} | {project.customer_phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              {STATUS_LABELS[project.project_status] || project.project_status}
            </span>
            <button onClick={handleDeleteProject} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition">
              ลบโครงการ
            </button>
          </div>
        </div>
      </section>

      {/* Content: Show Packages or Package Detail */}
      {!selectedPackage ? (
        <>
          {/* Summary Tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowSummaryMatrix(true)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${showSummaryMatrix ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              📊 ภาพรวมทั้งหมด
            </button>
            <button onClick={() => setShowSummaryMatrix(false)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!showSummaryMatrix ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              📁 ชุดเอกสาร
            </button>
          </div>

          {showSummaryMatrix ? (
            <SummaryMatrix packages={packages} packageDetails={packageDetails} />
          ) : (
          /* Package List */
          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">ชุดเอกสารที่เกี่ยวข้อง ({packages.length})</h2>
              <button onClick={() => setShowAddPackageModal(true)} className="px-4 py-2 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700">
                + เพิ่มชุดเอกสาร
              </button>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 mb-4">ยังไม่มีชุดเอกสาร</p>
                <button onClick={() => setShowAddPackageModal(true)} className="px-6 py-3 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700">
                  + สร้างชุดเอกสารแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} onClick={() => loadPackageDetail(pkg.id)} onDelete={handleDeletePackage} />
                ))}
              </div>
            )}
          </section>
          )}
        </>
      ) : (
        <>
          {/* Package Detail */}
          <PackageDetail
            pkg={selectedPackage}
            onBack={() => { setSelectedPackage(null); loadProject(); }}
            onComment={(cl) => { setSelectedChecklist(cl); setShowCommentModal(true); }}
            onRefresh={() => loadPackageDetail(selectedPackage.id)}
            onDeletePackage={handleDeletePackage}
          />
        </>
      )}

      {/* Modals */}
      {showAddPackageModal && (
        <AddPackageModal
          projectId={id}
          onClose={() => setShowAddPackageModal(false)}
          onCreated={() => { setShowAddPackageModal(false); loadProject(); }}
        />
      )}

      {showCommentModal && selectedChecklist && (
        <CommentModal
          checklist={selectedChecklist}
          onClose={() => { setShowCommentModal(false); setSelectedChecklist(null); }}
          onCommented={() => { setShowCommentModal(false); setSelectedChecklist(null); loadPackageDetail(selectedPackage.id); }}
        />
      )}
    </div>
  );
}

// ============================================================
// SummaryMatrix Component - ตารางสรุปสถานะเอกสารทั้งหมด
// ============================================================
function SummaryMatrix({ packages, packageDetails }) {
  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    checking: 'bg-blue-100 text-blue-700',
    customer_revision: 'bg-orange-100 text-orange-700',
    passed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700'
  };

  const statusIcons = {
    pending: '-',
    checking: '⏳',
    customer_revision: '⚠',
    passed: '✓',
    failed: '✗'
  };

  // รวม checklist items ทั้งหมดจากทุก package
  const allItems = [];
  const packageNames = [];

  packages.forEach(pkg => {
    packageNames.push({ id: pkg.id, name: pkg.package_name, agency: pkg.agency });
    const details = packageDetails[pkg.id];
    if (details && details.checklists) {
      details.checklists.forEach(item => {
        const existing = allItems.find(i => i.document_name === item.document_name);
        if (existing) {
          existing.packages[pkg.id] = item.status || 'pending';
        } else {
          allItems.push({
            document_name: item.document_name,
            packages: { [pkg.id]: item.status || 'pending' }
          });
        }
      });
    }
  });

  // คำนวณสรุปแต่ละ package
  const packageSummary = packageNames.map(pkg => {
    const details = packageDetails[pkg.id];
    const checklists = details?.checklists || [];
    const passed = checklists.filter(c => c.status === 'passed').length;
    const total = checklists.length;
    return {
      ...pkg,
      passed,
      total,
      progress: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  });

  if (packages.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm text-center">
        <p className="text-slate-400">ยังไม่มีชุดเอกสาร</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-slate-100">
        {packageSummary.map(pkg => (
          <div key={pkg.id} className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 transition">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📋</span>
              <span className="font-semibold text-sm text-slate-900 truncate">{pkg.name}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">{pkg.agency}</p>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">{pkg.passed}/{pkg.total} ผ่าน</span>
              <span className="font-semibold text-slate-900">{pkg.progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pkg.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">รายการเอกสาร</th>
              {packageNames.map(pkg => (
                <th key={pkg.id} className="px-4 py-4 text-center text-sm font-semibold text-purple-700">
                  <div>{pkg.name.split(' ')[0]}</div>
                  <div className="text-xs font-normal text-slate-500">{pkg.agency}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm font-medium text-slate-900">{item.document_name}</td>
                {packageNames.map(pkg => {
                  const status = item.packages[pkg.id] || 'pending';
                  return (
                    <td key={pkg.id} className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                        {statusIcons[status]} {status === 'passed' ? 'ผ่าน' : status === 'failed' ? 'ขาด' : status === 'checking' ? 'รอตรวจ' : status === 'customer_revision' ? 'ต้องแก้' : '-'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700">✓ ผ่าน</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700">✗ ขาด</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700">⏳ รอตรวจ</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700">⚠ ต้องแก้</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600">- ยังไม่มี</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PackageCard Component
// ============================================================
function PackageCard({ pkg, onClick, onDelete }) {
  const progress = pkg.total_docs > 0 ? Math.round((pkg.passed_docs / pkg.total_docs) * 100) : 0;
  return (
    <div className="p-5 rounded-2xl border-2 border-slate-200 hover:border-purple-400 transition hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onClick}>
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">📋</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 text-sm">{pkg.package_name}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[pkg.package_status] || 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABELS[pkg.package_status] || pkg.package_status}
              </span>
            </div>
            <p className="text-xs text-slate-500">{pkg.agency}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(pkg.id, pkg.package_name); }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition" title="ลบชุดเอกสาร">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>{pkg.passed_docs || 0}/{pkg.total_docs || 0} เอกสาร</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">กำหนด: {pkg.due_date || 'ไม่กำหนด'}</span>
        <span className="text-xs text-purple-600 font-medium">ดูรายละเอียด →</span>
      </div>
    </div>
  );
}

// ============================================================
// PackageDetail Component
// ============================================================
function PackageDetail({ pkg, onBack, onComment, onRefresh, onDeletePackage }) {
  const [checklists, setChecklists] = useState(pkg.checklists || []);
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [commentsMap, setCommentsMap] = useState({});
  const [activeTab, setActiveTab] = useState('checklist');
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showAgencySubmitModal, setShowAgencySubmitModal] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const loadCommentsForChecklists = async (items) => {
    const newCommentsMap = {};
    for (const item of items) {
      if (item.status === 'failed' || item.status === 'customer_revision') {
        try {
          const comments = await documentReviewAPI.getReviewComments(item.id);
          newCommentsMap[item.id] = Array.isArray(comments) ? comments : [];
        } catch (error) {
          console.error('Failed to load comments:', error);
          newCommentsMap[item.id] = [];
        }
      }
    }
    setCommentsMap(newCommentsMap);
  };

  const loadIssues = async () => {
    setIssuesLoading(true);
    try {
      const data = await documentReviewAPI.getIssuesByPackage(pkg.id);
      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const loadReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const items = pkg.checklists || [];
      const allReceipts = [];
      for (const item of items) {
        try {
          const r = await documentReviewAPI.getReceiptsByChecklist(item.id);
          if (Array.isArray(r)) {
            r.forEach(receipt => allReceipts.push({ ...receipt, document_name: item.document_name }));
          }
        } catch (e) { /* skip */ }
      }
      setReceipts(allReceipts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setReceiptsLoading(false);
    }
  };

  useEffect(() => {
    setChecklists(pkg.checklists || []);
    loadCommentsForChecklists(pkg.checklists || []);
    loadIssues();
    loadReceipts();
  }, [pkg]);

  const handleAddItem = async (title) => {
    try {
      await documentReviewAPI.createReviewChecklist(pkg.project_id, {
        package_id: pkg.id,
        document_name: title,
        is_required: true
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleRemoveItem = async (checklistId) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return;
    try {
      await documentReviewAPI.deleteReviewChecklist(checklistId);
      onRefresh();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleToggleRequired = async (item) => {
    try {
      await documentReviewAPI.updateReviewChecklist(item.id, { is_required: !item.is_required });
      setChecklists(prev => prev.map(c => c.id === item.id ? { ...c, is_required: !item.is_required ? 1 : 0 } : c));
    } catch (error) {
      console.error('Failed to toggle required:', error);
    }
  };

  const handleResolveIssue = async (issueId) => {
    try {
      await documentReviewAPI.resolveIssue(issueId);
      loadIssues();
      onRefresh();
    } catch (error) {
      console.error('Failed to resolve issue:', error);
    }
  };

  const handleApproveInternal = async () => {
    try {
      await documentReviewAPI.approveProject(pkg.project_id, { package_id: pkg.id });
      setShowApproveModal(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('อนุมัติไม่สำเร็จ');
    }
  };

  const passed = checklists.filter(c => c.status === 'passed').length;
  const total = checklists.length;
  const progress = total > 0 ? Math.round((passed / total) * 100) : 0;
  const openIssues = issues.filter(i => i.status === 'open').length;
  const isAllPassed = total > 0 && passed === total;
  const hasOpenIssues = openIssues > 0;

  const tabs = [
    { id: 'checklist', label: 'รายการเอกสาร', count: total },
    { id: 'issues', label: 'ปัญหา', count: openIssues },
    { id: 'receipts', label: 'ประวัติรับเอกสาร' },
    { id: 'approval', label: 'อนุมัติ / ยื่นหน่วยงาน' },
  ];

  return (
    <>
      {/* Back button + Package Info */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-700">← กลับไปรายการชุดเอกสาร</button>
          <button onClick={() => onDeletePackage(pkg.id, pkg.package_name)} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            ลบชุดเอกสารนี้
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{pkg.package_name}</h2>
            <p className="text-slate-500 mt-1">{pkg.agency} | กำหนด: {pkg.due_date || 'ไม่กำหนด'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Progress</p>
            <p className="text-2xl font-bold text-slate-900">{passed}/{total} ({progress}%)</p>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'} px-1.5 py-0.5 rounded-full`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'checklist' && (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">รายการเอกสาร ({total})</h3>
            <button onClick={() => setShowAddChecklist(true)} className="px-4 py-2 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700">
              + เพิ่มหัวข้อ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">ลำดับ</th>
                  <th className="px-6 py-3 text-left font-semibold">เอกสาร</th>
                  <th className="px-6 py-3 text-center font-semibold">จำเป็น</th>
                  <th className="px-6 py-3 text-left font-semibold">สถานะ</th>
                  <th className="px-6 py-3 text-left font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {checklists.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.document_name}</p>
                      {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleRequired(item)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer transition font-semibold ${
                          item.is_required
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="คลิกเพื่อสลับสถานะ จำเป็น / ไม่บังคับ"
                      >
                        {item.is_required ? 'จำเป็น' : 'ไม่บังคับ'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${CHECKLIST_STATUS[item.status]?.color || ''}`}>
                        {CHECKLIST_STATUS[item.status]?.label || item.status}
                      </span>
                      {(item.status === 'failed' || item.status === 'customer_revision') && commentsMap[item.id]?.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                          {commentsMap[item.id].slice(0, 2).map((c, idx) => (
                            <div key={idx} className="text-xs text-red-700">
                              <span className="font-medium">{c.reviewer_name || 'เจ้าหน้าที่'}:</span> {c.comment || 'ไม่มีหมายเหตุ'}
                            </div>
                          ))}
                          {commentsMap[item.id].length > 2 && (
                            <p className="text-xs text-red-500 mt-1">+ อีก {commentsMap[item.id].length - 2} รายการ</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onComment(item)} className="px-3 py-1.5 rounded-lg bg-purple-600 text-xs font-medium text-white hover:bg-purple-700">ตรวจ</button>
                        <button onClick={() => { setSelectedChecklistItem(item); setShowReceiptModal(true); }} className="px-3 py-1.5 rounded-lg bg-blue-100 text-xs font-medium text-blue-700 hover:bg-blue-200">บันทึกรับ</button>
                        <button onClick={() => { setSelectedChecklistItem(item); setShowIssueModal(true); }} className="px-3 py-1.5 rounded-lg bg-red-100 text-xs font-medium text-red-700 hover:bg-red-200">สร้าง Issue</button>
                        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'issues' && (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">ปัญหาที่ต้องแก้ไข ({issues.filter(i => i.status === 'open').length} ค้าง / {issues.length} ทั้งหมด)</h3>
            {issues.filter(i => i.status === 'open').length > 0 && (
              <button
                onClick={async () => {
                  const openIssues = issues.filter(i => i.status === 'open');
                  if (openIssues.length === 0) return;
                  try {
                    const report = await documentReviewAPI.createCorrectionReport({
                      package_id: pkg.id,
                      issue_ids: openIssues.map(i => i.id)
                    });
                    window.open(`/doc-review/correction-report/${report.id}`, '_blank');
                  } catch (e) {
                    console.error(e);
                    alert('สร้างรายงานไม่สำเร็จ');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700"
              >
                สร้างรายงานส่งลูกค้า ({issues.filter(i => i.status === 'open').length})
              </button>
            )}
          </div>
          {issuesLoading ? (
            <div className="p-6 text-center text-slate-400">กำลังโหลด...</div>
          ) : issues.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-400 mb-2">ไม่มีปัญหา</p>
              <p className="text-xs text-slate-400">ปัญหาจะเกิดขึ้นเมื่อตรวจเอกสารแล้วพบว่าต้องแก้ไข</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {issues.map(issue => (
                <div key={issue.id} className={`p-5 ${issue.status === 'resolved' ? 'bg-slate-50 opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${issue.issue_source === 'agency' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                          {issue.issue_source === 'agency' ? 'จากหน่วยงาน' : 'ตรวจสอบภายใน'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${issue.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {issue.status === 'open' ? 'ยังไม่แก้' : 'แก้แล้ว'}
                        </span>
                        <span className="text-xs text-slate-400">V{issue.revision_round}</span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm">{issue.document_name || 'เอกสารไม่ระบุ'}</p>
                      <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                      {issue.required_action && (
                        <p className="text-xs text-blue-600 mt-1">ต้องทำ: {issue.required_action}</p>
                      )}
                    </div>
                    {issue.status === 'open' && (
                      <button onClick={() => handleResolveIssue(issue.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 shrink-0 ml-4">
                        แก้ไขแล้ว
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'receipts' && (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">ประวัติการรับเอกสาร ({receipts.length})</h3>
          </div>
          {receiptsLoading ? (
            <div className="p-6 text-center text-slate-400">กำลังโหลด...</div>
          ) : receipts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-400 mb-2">ยังไม่มีประวัติการรับเอกสาร</p>
              <p className="text-xs text-slate-400">คลิกปุ่ม "บันทึกรับ" ในแท็บรายการเอกสารเพื่อบันทึกการรับเอกสารจากลูกค้า</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {receipts.map(receipt => (
                <div key={receipt.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{receipt.document_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ได้รับจาก: {receipt.received_from || '-'} | ช่องทาง: {receipt.received_channel || '-'} | วันที่: {receipt.received_date || '-'}
                    </p>
                    {receipt.notes && <p className="text-xs text-slate-400 mt-0.5">หมายเหตุ: {receipt.notes}</p>}
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">V{receipt.revision_round}</span>
                    <p className="text-xs text-slate-400 mt-1">{receipt.created_at}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'approval' && (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">อนุมัติ / ยื่นหน่วยงาน</h3>
          </div>
          <div className="p-6 space-y-4">
            {/* Internal Approval */}
            <div className={`p-5 rounded-xl border-2 ${isAllPassed && !hasOpenIssues ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <h4 className="font-semibold text-slate-900 mb-2">อนุมัติภายใน (Approve to Submit)</h4>
              <p className="text-sm text-slate-500 mb-3">
                {isAllPassed && !hasOpenIssues
                  ? 'เอกสารผ่านทั้งหมดแล้ว พร้อมอนุมัติภายใน'
                  : `ต้องตรวจผ่านทั้งหมดและไม่มีปัญหาค้าง (${passed}/${total} ผ่าน, ${openIssues} ปัญหาค้าง)`}
              </p>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={!isAllPassed || hasOpenIssues}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                อนุมัติภายใน
              </button>
            </div>

            {/* Agency Submission */}
            <div className="p-5 rounded-xl border-2 border-indigo-200 bg-indigo-50">
              <h4 className="font-semibold text-slate-900 mb-2">ยื่นหน่วยงาน</h4>
              <p className="text-sm text-slate-500 mb-3">บันทึกการยื่นเอกสารให้หน่วยงาน พร้อมวันที่ หน่วยงาน และรอบการยื่น</p>
              <button
                onClick={() => setShowAgencySubmitModal(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                บันทึกการยื่นหน่วยงาน
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Add Checklist Item Modal */}
      {showAddChecklist && (
        <AddChecklistItemModal
          onAdd={handleAddItem}
          onClose={() => setShowAddChecklist(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedChecklistItem && (
        <ReceiptModal
          checklistItem={selectedChecklistItem}
          packageId={pkg.id}
          onClose={() => { setShowReceiptModal(false); setSelectedChecklistItem(null); }}
          onCreated={() => { setShowReceiptModal(false); setSelectedChecklistItem(null); onRefresh(); }}
        />
      )}

      {/* Issue Modal */}
      {showIssueModal && selectedChecklistItem && (
        <CreateIssueModal
          checklistItem={selectedChecklistItem}
          packageId={pkg.id}
          onClose={() => { setShowIssueModal(false); setSelectedChecklistItem(null); }}
          onCreated={() => { setShowIssueModal(false); setSelectedChecklistItem(null); loadIssues(); }}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">อนุมัติภายใน</h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-slate-600 mb-4">ยืนยันอนุมัติเอกสารภายใน เพื่อยื่นให้หน่วยงานต่อไป?</p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
                <button onClick={handleApproveInternal} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">ยืนยันอนุมัติ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agency Submit Modal */}
      {showAgencySubmitModal && (
        <AgencySubmitModal
          packageData={pkg}
          onClose={() => setShowAgencySubmitModal(false)}
          onCreated={() => { setShowAgencySubmitModal(false); onRefresh(); }}
        />
      )}
    </>
  );
}

// ============================================================
// AddPackageModal Component
// ============================================================
function AddPackageModal({ projectId, onClose, onCreated }) {
  const [formData, setFormData] = useState({ package_name: '', permit_type: 'pck2', agency: '', due_date: '' });
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const result = await documentReviewAPI.getTemplateChecklists();
      setTemplates(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.package_name || !formData.permit_type) return;
    try {
      setLoading(true);
      await documentReviewAPI.createPackage(projectId, formData);
      onCreated();
    } catch (error) {
      console.error('Failed:', error);
      alert('สร้างไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (template) => {
    try {
      setLoading(true);
      // Create package from template
      const pkg = await documentReviewAPI.createPackage(projectId, {
        package_name: template.name,
        permit_type: template.permit_type,
        agency: template.agency || ''
      });
      // Generate checklist from template
      await documentReviewAPI.generateChecklist(pkg.id, template.id);
      onCreated();
    } catch (error) {
      console.error('Failed:', error);
      alert('สร้างไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">เพิ่มชุดเอกสาร</h2>
        </div>

        {/* Quick Add from Template */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-medium text-slate-700 mb-3">เลือกจาก Template สำเร็จรูป</p>
          {templatesLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลด...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มี Template</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {templates.map((t) => (
                <button key={t.id} onClick={() => handleQuickAdd(t)} disabled={loading}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition text-left disabled:opacity-50">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{t.name}</span>
                    <p className="text-xs text-slate-500">{t.agency || ''}</p>
                  </div>
                  <span className="text-xs text-slate-500">{t.item_count || 0} รายการ</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Package */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <p className="text-sm font-medium text-slate-700">หรือสร้างชุดเอกสารเอง</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อชุดเอกสาร</label>
            <input type="text" value={formData.package_name} onChange={(e) => setFormData({...formData, package_name: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="เช่น พค.2 ใบอนุญาตผลิตพลังงานควบคุม" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทใบอนุญาต</label>
            <select value={formData.permit_type} onChange={(e) => setFormData({...formData, permit_type: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
              {Object.entries(PERMIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงาน</label>
            <input type="text" value={formData.agency} onChange={(e) => setFormData({...formData, agency: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="เช่น กกพ./พพ." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">กำหนดส่ง</label>
            <input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={loading || !formData.package_name} className="px-6 py-2.5 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'กำลังสร้าง...' : 'สร้างชุดเอกสาร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AddChecklistItemModal Component
// ============================================================
function AddChecklistItemModal({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim());
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">เพิ่มหัวข้อเอกสาร</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อเอกสาร</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="กรอกชื่อเอกสาร..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button onClick={handleSubmit} disabled={!title.trim()} className="px-6 py-2.5 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">เพิ่ม</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ReceiptModal Component - บันทึกรับเอกสารจากลูกค้า
// ============================================================
function ReceiptModal({ checklistItem, packageId, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    received_from: '',
    received_channel: 'line',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await documentReviewAPI.createReceipt({
        checklist_item_id: checklistItem.id,
        package_id: packageId,
        ...formData
      });
      onCreated();
    } catch (error) {
      console.error('Failed:', error);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">บันทึกรับเอกสาร: {checklistItem.document_name}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ได้รับจาก</label>
            <input type="text" value={formData.received_from} onChange={(e) => setFormData({...formData, received_from: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="ชื่อผู้ส่ง เช่น คุณวิชัย" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทาง</label>
            <select value={formData.received_channel} onChange={(e) => setFormData({...formData, received_channel: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
              <option value="line">LINE</option>
              <option value="email">Email</option>
              <option value="drive">Google Drive</option>
              <option value="paper">เอกสารกระดาษ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับ</label>
            <input type="date" value={formData.received_date} onChange={(e) => setFormData({...formData, received_date: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกรับเอกสาร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CreateIssueModal Component - สร้าง Issue จากการตรวจ
// ============================================================
function CreateIssueModal({ checklistItem, packageId, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    issue_source: 'internal',
    description: '',
    required_action: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) return;
    try {
      setSubmitting(true);
      await documentReviewAPI.createIssue({
        checklist_item_id: checklistItem.id,
        package_id: packageId,
        ...formData
      });
      onCreated();
    } catch (error) {
      console.error('Failed:', error);
      alert('สร้าง Issue ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">สร้าง Issue: {checklistItem.document_name}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">แหล่งที่มา</label>
            <select value={formData.issue_source} onChange={(e) => setFormData({...formData, issue_source: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
              <option value="internal">ตรวจสอบภายใน (ทีมงานตรวจพบ)</option>
              <option value="agency">จากหน่วยงาน (หน่วยงานให้แก้)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ปัญหาที่พบ *</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="อธิบายปัญหาที่พบ..." autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สิ่งที่ต้องแก้ไข</label>
            <textarea rows="2" value={formData.required_action} onChange={(e) => setFormData({...formData, required_action: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="ระบุว่าต้องแก้ไขอะไร..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting || !formData.description.trim()} className="px-6 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {submitting ? 'กำลังสร้าง...' : 'สร้าง Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AgencySubmitModal Component - บันทึกการยื่นหน่วยงาน
// ============================================================
function AgencySubmitModal({ packageData, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    agency_name: packageData.agency || '',
    submitted_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await documentReviewAPI.submitToAgency(packageData.project_id, {
        package_id: packageData.id,
        ...formData
      });
      onCreated();
    } catch (error) {
      console.error('Failed:', error);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">บันทึกการยื่นหน่วยงาน</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงาน *</label>
            <input type="text" value={formData.agency_name} onChange={(e) => setFormData({...formData, agency_name: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="เช่น กกพ./พพ." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ยื่น *</label>
            <input type="date" value={formData.submitted_date} onChange={(e) => setFormData({...formData, submitted_date: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting || !formData.agency_name} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการยื่น'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ============================================================
// CommentModal Component
// ============================================================
function CommentModal({ checklist, onClose, onCommented }) {
  const [reviewStatus, setReviewStatus] = useState('passed');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await documentReviewAPI.addReviewComment(checklist.id, {
        comment_type: 'internal',
        review_status: reviewStatus,
        comment
      });
      onCommented();
    } catch (error) {
      console.error('Failed:', error);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">ตรวจ: {checklist.document_name}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ผลการตรวจ</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'passed', label: '✓ ผ่าน', color: 'emerald' },
                { val: 'failed', label: '✗ ไม่ผ่าน', color: 'red' },
                { val: 'needs_revision', label: '⚠ ต้องแก้ไข', color: 'orange' }
              ].map(({ val, label, color }) => (
                <label key={val} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${reviewStatus === val ? `border-${color}-500 bg-${color}-50` : 'border-slate-200 hover:border-' + color + '-400'}`}>
                  <input type="radio" name="status" value={val} checked={reviewStatus === val} onChange={(e) => setReviewStatus(e.target.value)} className="hidden" />
                  <span className={`text-${color}-600`}>{label.split(' ')[0]}</span>
                  <span className="text-sm font-medium">{label.split(' ').slice(1).join(' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">คอมเมนต์</label>
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="กรอกหมายเหตุ/ปัญหา..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกผลตรวจ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
