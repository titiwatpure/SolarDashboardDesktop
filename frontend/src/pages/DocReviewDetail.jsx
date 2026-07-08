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
  received: { label: 'รับแล้ว', color: 'bg-cyan-100 text-cyan-700' },
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
            <button
              onClick={() => navigate('/doc-review')}
              className="text-sm text-slate-500 hover:text-slate-700 mb-3 inline-flex items-center gap-1"
            >
              ← กลับไปแดชบอร์ด
            </button>
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
      ) : (
          <>
          {/* Package Detail */}
          <PackageDetail
            pkg={selectedPackage}
            onBack={() => { setSelectedPackage(null); loadProject(); }}
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
    </div>
  );
}


// ============================================================
// PackageCard Component
// ============================================================
function PackageCard({ pkg, onClick, onDelete }) {
  // ใช้ required_passed/required_total เหมือน PackageDetail เพื่อให้ตรงกัน
  const progress = pkg.required_total > 0 ? Math.round((pkg.required_passed / pkg.required_total) * 100) : 0;
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
        <span>{pkg.required_passed || 0}/{pkg.required_total || 0} จำเป็น</span>
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
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [showBulkReceive, setShowBulkReceive] = useState(false);
  const [showBulkApprove, setShowBulkApprove] = useState(false);
  const [showBulkForcePass, setShowBulkForcePass] = useState(false);
  const [showBulkReject, setShowBulkReject] = useState(false);

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
      // Refresh จาก server เพื่อให้ recalculate package status + required counts ถูกต้อง
      onRefresh();
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

  const requiredItems = checklists.filter(c => c.is_required);
  const requiredPassed = requiredItems.filter(c => c.status === 'passed').length;
  const requiredTotal = requiredItems.length;
  const requiredProgress = requiredTotal > 0 ? Math.round((requiredPassed / requiredTotal) * 100) : 0;
  const openIssues = issues.filter(i => i.status === 'open').length;
  const isAllRequiredPassed = requiredTotal > 0 && requiredPassed === requiredTotal;
  const hasOpenIssues = openIssues > 0;

  const tabs = [
    { id: 'checklist', label: 'รายการเอกสาร', count: checklists.length },
    { id: 'issues', label: 'ปัญหา', count: openIssues },
    { id: 'receipts', label: 'ประวัติรับเอกสาร' },
    { id: 'approval', label: 'อนุมัติ / ยื่นหน่วยงาน' },
    { id: 'timeline', label: 'ประวัติ' },
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
          <div className="flex items-center gap-4">
            {/* Status Badge — แสดงสถานะปัจจุบันของ package */}
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[pkg.package_status] || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_LABELS[pkg.package_status] || pkg.package_status}
            </span>
            <div className="text-right">
              <p className="text-sm text-slate-500">Progress (จำเป็น)</p>
              <p className={`text-2xl font-bold ${requiredProgress === 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {requiredPassed}/{requiredTotal} ({requiredProgress}%)
              </p>
            </div>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mt-4">
          <div
            className={`h-full rounded-full transition-all ${requiredProgress === 100 ? 'bg-emerald-500' : requiredProgress >= 50 ? 'bg-blue-500' : 'bg-purple-500'}`}
            style={{ width: `${requiredProgress}%` }}
          />
        </div>

        {/* Banner เมื่อเอกสารครบ 100% */}
        {isAllRequiredPassed && !hasOpenIssues && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <span className="text-emerald-600 text-lg">✓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">เอกสารจำเป็นครบทุกรายการ</p>
              <p className="text-xs text-emerald-600">ไปที่แท็บ "อนุมัติ / ยื่นหน่วยงาน" เพื่อดำเนินการต่อ</p>
            </div>
            <button
              onClick={() => setActiveTab('approval')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shrink-0"
            >
              ไปอนุมัติ →
            </button>
          </div>
        )}
        {isAllRequiredPassed && hasOpenIssues && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <span className="text-amber-600 text-lg">⚠</span>
            <p className="text-sm text-amber-700">เอกสารครบแล้ว แต่ยังมีปัญหาค้าง {openIssues} รายการ กรุณา Resolve ก่อนอนุมัติ</p>
          </div>
        )}
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
      {activeTab === 'checklist' && (() => {
        const receivable = ['not_received', 'pending', 'customer_revision', 'agency_revision', 'failed'];
        const approvable = ['received', 'checking'];
        const selectableIds = checklists.filter(c => receivable.includes(c.status) || approvable.includes(c.status)).map(c => c.id);
        const allChecked = selectableIds.length > 0 && selectableIds.every(id => bulkSelected.includes(id));
        return (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">รายการเอกสาร ({checklists.length})</h3>
            <button onClick={() => setShowAddChecklist(true)} className="px-4 py-2 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700">
              + เพิ่มหัวข้อ
            </button>
          </div>

          {/* Bulk Action Bar - แสดงเฉพาะเมื่อเลือก */}
          {bulkSelected.length > 0 && (
            <div className="px-6 py-3 bg-violet-50 border-b border-violet-200 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-violet-700">เลือกแล้ว {bulkSelected.length} รายการ</span>
              <div className="flex-1"></div>
              {bulkSelected.some(id => checklists.find(c => c.id === id && receivable.includes(c.status))) && (
                <button onClick={() => setShowBulkReceive(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700">
                  บันทึกรับเอกสารที่เลือก
                </button>
              )}
              {bulkSelected.some(id => checklists.find(c => c.id === id && approvable.includes(c.status))) && (
                <button onClick={() => setShowBulkApprove(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
                  ตรวจผ่านรายการที่เลือก
                </button>
              )}
              {bulkSelected.some(id => checklists.find(c => c.id === id && c.status !== 'passed')) && (
                <button onClick={() => setShowBulkForcePass(true)} className="px-4 py-2 rounded-xl bg-green-700 text-xs font-semibold text-white hover:bg-green-800">
                  ✓ ผ่านทั้งหมดที่เลือก
                </button>
              )}
              <button onClick={() => setShowBulkReject(true)} className="px-4 py-2 rounded-xl bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600">
                ส่งกลับแก้รายการที่เลือก
              </button>
              <button onClick={() => setBulkSelected([])} className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100">
                ยกเลิกเลือก
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-center w-10">
                    <input type="checkbox" checked={allChecked} onChange={(e) => setBulkSelected(e.target.checked ? selectableIds : [])} className="rounded border-slate-300" title="เลือกทั้งหมดที่ทำได้" />
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">ลำดับ</th>
                  <th className="px-6 py-3 text-left font-semibold">เอกสาร</th>
                  <th className="px-6 py-3 text-center font-semibold">จำเป็น</th>
                  <th className="px-6 py-3 text-left font-semibold">สถานะ</th>
                  <th className="px-6 py-3 text-left font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {checklists.map((item, index) => {
                  const canCheck = receivable.includes(item.status) || approvable.includes(item.status);
                  return (
                  <tr key={item.id} className={bulkSelected.includes(item.id) ? 'bg-violet-50' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-4 text-center">
                      {canCheck && (
                        <input type="checkbox" checked={bulkSelected.includes(item.id)} onChange={(e) => setBulkSelected(e.target.checked ? [...bulkSelected, item.id] : bulkSelected.filter(id => id !== item.id))} className="rounded border-slate-300" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.document_name}</p>
                      {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleRequired(item)} className={`text-xs px-2 py-1 rounded cursor-pointer transition font-semibold ${item.is_required ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} title="คลิกเพื่อสลับสถานะ จำเป็น / ไม่บังคับ">
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
                        <button onClick={() => { setSelectedChecklist(item); setShowCommentModal(true); }} className="px-3 py-1.5 rounded-lg bg-purple-600 text-xs font-medium text-white hover:bg-purple-700">ตรวจ</button>
                        <button onClick={() => { setSelectedChecklistItem(item); setShowReceiptModal(true); }} className="px-3 py-1.5 rounded-lg bg-blue-100 text-xs font-medium text-blue-700 hover:bg-blue-200">บันทึกรับ</button>
                        <button onClick={() => { setSelectedChecklistItem(item); setShowIssueModal(true); }} className="px-3 py-1.5 rounded-lg bg-red-100 text-xs font-medium text-red-700 hover:bg-red-200">สร้าง Issue</button>
                        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">🗑</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        );
      })()}

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
            {(() => {
              const requiredNotPassed = checklists.filter(c => c.is_required && c.status !== 'passed').length;
              const openIssuesList = issues.filter(i => i.status === 'open');
              const canApprove = isAllRequiredPassed;
              const approval = pkg?.latest_approval;
              return (
                <div className={`p-5 rounded-xl border-2 ${canApprove ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <h4 className="font-semibold text-slate-900 mb-2">อนุมัติภายใน (Approve to Submit)</h4>
                  {canApprove ? (
                    <p className="text-sm text-emerald-700 mb-3">✓ เอกสารผ่านทั้งหมดแล้ว พร้อมอนุมัติภายใน</p>
                  ) : (
                    <div className="text-sm text-amber-700 mb-3 space-y-1">
                      {requiredNotPassed > 0 && <p>• เอกสารจำเป็นยังไม่ผ่าน {requiredNotPassed} รายการ ({requiredPassed}/{requiredTotal} ผ่าน)</p>}
                      {openIssuesList.length > 0 && <p>• ปัญหาค้าง {openIssuesList.length} รายการ (ต้อง Resolve ให้ครบ)</p>}
                    </div>
                  )}
                  {approval && approval.approval_status === 'approved' && (
                    <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-600 font-medium">อนุมัติแล้ว</p>
                      <p className="text-sm text-slate-700">ผู้อนุมัติ: {approval.approver_name || '-'}</p>
                      <p className="text-xs text-slate-500">วันที่: {(() => { try { return new Date(approval.approved_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); } catch (e) { return approval.approved_at; } })()}</p>
                      {approval.comment && <p className="text-xs text-slate-500 mt-1">หมายเหตุ: {approval.comment}</p>}
                    </div>
                  )}
                  {approval && approval.approval_status === 'rejected' && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600 font-medium">ตีกลับ</p>
                      <p className="text-sm text-slate-700">ผู้ตีกลับ: {approval.approver_name || '-'}</p>
                      <p className="text-xs text-slate-500">วันที่: {(() => { try { return new Date(approval.approved_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); } catch (e) { return approval.approved_at; } })()}</p>
                      {approval.comment && <p className="text-xs text-red-500 mt-1">เหตุผล: {approval.comment}</p>}
                    </div>
                  )}
                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={!canApprove}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {approval && approval.approval_status === 'approved' ? 'อนุมัติแล้ว ✓' : 'อนุมัติภายใน'}
                  </button>
                </div>
              );
            })()}

            {/* Agency Submission */}
            {(() => {
              const projectStatus = pkg?.package_status;
              const hasApproved = pkg?.latest_approval?.approval_status === 'approved';
              const canSubmit = projectStatus === 'ready_to_submit' || projectStatus === 'agency_revision' || projectStatus === 'submitted_agency' || hasApproved;
              const latestSubmission = pkg?.latest_submission;
              return (
                <div className={`p-5 rounded-xl border-2 ${canSubmit ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                  <h4 className="font-semibold text-slate-900 mb-2">ยื่นหน่วยงาน</h4>
                  {!canSubmit ? (
                    <p className="text-sm text-slate-500 mb-3">ต้องอนุมัติภายในก่อนจึงจะยื่นหน่วยงานได้</p>
                  ) : (
                    <p className="text-sm text-slate-500 mb-3">บันทึกการยื่นเอกสารให้หน่วยงาน พร้อมวันที่ หน่วยงาน และรอบการยื่น</p>
                  )}
                  {latestSubmission && (
                    <div className="mb-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                      <p className="text-xs text-indigo-600 font-medium">ยื่นล่าสุด รอบที่ {latestSubmission.submission_round}</p>
                      <p className="text-sm text-slate-700">หน่วยงาน: {latestSubmission.agency_name || '-'}</p>
                      <p className="text-xs text-slate-500">วันที่ยื่น: {latestSubmission.submitted_date || '-'}</p>
                      <p className="text-xs text-slate-500">บันทึกเมื่อ: {(() => { try { return new Date(latestSubmission.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }); } catch (e) { return latestSubmission.created_at; } })()}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setShowAgencySubmitModal(true)}
                    disabled={!canSubmit}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {latestSubmission ? 'บันทึกการยื่นหน่วยงาน (รอบใหม่)' : 'บันทึกการยื่นหน่วยงาน'}
                  </button>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <TimelineTab packageId={pkg.id} />
      )}

      {/* Add Checklist Item Modal */}
      {showAddChecklist && (
        <AddChecklistItemModal
          onAdd={handleAddItem}
          onClose={() => setShowAddChecklist(false)}
        />
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedChecklist && (
        <CommentModal
          checklist={selectedChecklist}
          openIssuesCount={issues.filter(i => i.checklist_item_id === selectedChecklist.id && i.status === 'open').length}
          onClose={() => { setShowCommentModal(false); setSelectedChecklist(null); }}
          onCommented={() => { setShowCommentModal(false); setSelectedChecklist(null); onRefresh(); }}
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

      {/* Bulk Receive Modal */}
      {showBulkReceive && (
        <BulkReceiveModal
          projectId={pkg.project_id}
          checklistIds={bulkSelected.filter(id => checklists.find(c => c.id === id && ['not_received', 'pending', 'customer_revision', 'agency_revision', 'failed'].includes(c.status)))}
          onClose={() => setShowBulkReceive(false)}
          onDone={() => { setShowBulkReceive(false); setBulkSelected([]); onRefresh(); }}
        />
      )}

      {/* Bulk Approve Modal */}
      {showBulkApprove && (
        <BulkApproveModal
          checklistIds={bulkSelected.filter(id => checklists.find(c => c.id === id && ['received', 'checking'].includes(c.status)))}
          onClose={() => setShowBulkApprove(false)}
          onDone={() => { setShowBulkApprove(false); setBulkSelected([]); onRefresh(); }}
        />
      )}

      {/* Bulk Force Pass Modal */}
      {showBulkForcePass && (
        <BulkForcePassModal
          checklistIds={bulkSelected.filter(id => checklists.find(c => c.id === id && c.status !== 'passed'))}
          onClose={() => setShowBulkForcePass(false)}
          onDone={() => { setShowBulkForcePass(false); setBulkSelected([]); onRefresh(); }}
        />
      )}

      {/* Bulk Reject Modal */}
      {showBulkReject && (
        <BulkRejectModal
          checklistIds={bulkSelected}
          onClose={() => setShowBulkReject(false)}
          onDone={() => { setShowBulkReject(false); setBulkSelected([]); onRefresh(); }}
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
function CommentModal({ checklist, onClose, onCommented, openIssuesCount = 0 }) {
  const [reviewStatus, setReviewStatus] = useState('needs_revision');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reviewStatus !== 'passed' || openIssuesCount === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
            {reviewStatus === 'passed' && openIssuesCount > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">⚠ เลือก "ผ่าน" ไม่ได้ — ยังมีปัญหาค้าง {openIssuesCount} รายการ Resolve ก่อน</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">คอมเมนต์</label>
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="กรอกหมายเหตุ/ปัญหา..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting || !canSubmit} className="px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกผลตรวจ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// BulkReceiveModal - บันทึกรับเอกสารที่เลือก
// ============================================================
function BulkReceiveModal({ projectId, checklistIds, onClose, onDone }) {
  const [formData, setFormData] = useState({ received_from: '', received_channel: 'line', received_date: new Date().toISOString().split('T')[0], file_reference: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await documentReviewAPI.batchReceiveChecklists(projectId, { checklist_ids: checklistIds, ...formData });
      onDone();
    } catch (error) {
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">บันทึกรับเอกสารที่เลือก ({checklistIds.length} รายการ)</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รับจาก *</label>
            <select value={formData.received_from} onChange={(e) => setFormData({...formData, received_from: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" required>
              <option value="">-- เลือก --</option>
              <option value="ลูกค้า">ลูกค้า</option>
              <option value="ทีม内部">ทีม内部</option>
              <option value="หน่วยงาน">หน่วยงาน</option>
              <option value="ผู้รับเหมา">ผู้รับเหมา</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทางรับเอกสาร</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">เลขอ้างอิง / ไฟล์อ้างอิง</label>
            <input type="text" value={formData.file_reference} onChange={(e) => setFormData({...formData, file_reference: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="เลขที่หนังสือ, ชื่อไฟล์" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting || !formData.received_from} className="px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกรับ ' + checklistIds.length + ' รายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// BulkApproveModal - ตรวจผ่านรายการที่เลือก
// ============================================================
function BulkApproveModal({ checklistIds, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await documentReviewAPI.batchApproveChecklists({ checklist_ids: checklistIds });
      setResult(res);
      if (res.passed && res.passed.length > 0) setTimeout(() => onDone(), 1500);
    } catch (error) {
      alert('ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">ผลการตรวจ</h2>
          <p className="text-sm text-emerald-600 font-medium">ผ่าน {result.passed.length} รายการ</p>
          {result.skipped && result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-orange-600 font-medium">ข้าม {result.skipped.length} รายการ:</p>
              {result.skipped.map((s, i) => <p key={i} className="text-xs text-slate-500 ml-4">- {s.reason}</p>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">ยืนยันตรวจผ่าน</h2>
        <p className="text-sm text-slate-600 mb-1">ตรวจผ่าน {checklistIds.length} รายการที่เลือก?</p>
        <p className="text-xs text-slate-400 mb-4">รายการที่มี Issue เปิดอยู่จะถูกข้าม</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
          <button onClick={handleConfirm} disabled={submitting} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {submitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BulkForcePassModal - ผ่านทั้งหมดที่เลือก (ไม่จำกัดสถานะ)
// ============================================================
function BulkForcePassModal({ checklistIds, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await documentReviewAPI.batchForcePassChecklists({ checklist_ids: checklistIds });
      setResult(res);
      if (res.passed && res.passed.length > 0) setTimeout(() => onDone(), 1500);
    } catch (error) {
      alert('ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">✓ ผ่านแล้ว</h2>
          <p className="text-sm text-emerald-600 font-medium">ผ่าน {result.passed.length} รายการ</p>
          {result.skipped && result.skipped.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">ข้าม {result.skipped.length} รายการ (ผ่านแล้ว)</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">✓ ผ่านทั้งหมดที่เลือก</h2>
        <p className="text-sm text-slate-600 mb-1">ยืนยันให้ผ่านทุกรายการที่เลือก {checklistIds.length} รายการ?</p>
        <p className="text-xs text-amber-600 mb-4">⚠ รายการทุกสถานะจะถูกตั้งเป็น "ผ่านแล้ว" ยกเว้นที่ผ่านแล้ว</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
          <button onClick={handleConfirm} disabled={submitting} className="px-6 py-2.5 rounded-xl bg-green-700 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
            {submitting ? 'กำลังดำเนินการ...' : `ยืนยัน (${checklistIds.length} รายการ)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BulkRejectModal - ส่งกลับแก้รายการที่เลือก
// ============================================================
function BulkRejectModal({ checklistIds, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return alert('กรุณาระบุเหตุผล');
    try {
      setSubmitting(true);
      await documentReviewAPI.batchRejectChecklists({ checklist_ids: checklistIds, reason });
      onDone();
    } catch (error) {
      alert('ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">ส่งกลับแก้ไข</h2>
        <p className="text-sm text-slate-500 mb-4">ส่งกลับ {checklistIds.length} รายการที่เลือก</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">เหตุผลที่ส่งกลับ *</label>
          <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="กรอกเหตุผลที่ต้องแก้ไข..." />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
          <button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="px-6 py-2.5 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {submitting ? 'กำลังดำเนินการ...' : 'ส่งกลับแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TimelineTab Component
// ============================================================
function TimelineTab({ packageId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [packageId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const pkgDetail = await documentReviewAPI.getPackage(packageId);
      const checklists = pkgDetail?.checklists || [];
      const allTimeline = [];

      for (const cl of checklists) {
        try {
          const tl = await documentReviewAPI.getChecklistTimeline(cl.id);
          if (Array.isArray(tl)) {
            tl.forEach(item => {
              allTimeline.push({ ...item, document_name: cl.document_name });
            });
          }
        } catch (e) { /* skip */ }
      }

      allTimeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTimeline(allTimeline);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType) => {
    const icons = {
      created: { icon: '+', color: 'bg-slate-400' },
      received: { icon: '\u2713', color: 'bg-blue-500' },
      checking: { icon: '?', color: 'bg-violet-500' },
      passed: { icon: '\u2713', color: 'bg-emerald-500' },
      failed: { icon: '\u2717', color: 'bg-red-500' },
      revision: { icon: '!', color: 'bg-orange-500' },
      issue: { icon: '!', color: 'bg-orange-500' },
      issue_resolved: { icon: '\u2713', color: 'bg-emerald-500' },
      file_uploaded: { icon: '\u2191', color: 'bg-blue-500' },
      submitted: { icon: '\u2192', color: 'bg-indigo-500' },
      agency_response: { icon: '\u2190', color: 'bg-cyan-500' }
    };
    return icons[eventType] || { icon: '?', color: 'bg-slate-400' };
  };

  const getEventLabel = (eventType) => {
    const labels = {
      created: 'สร้างรายการเอกสาร', received: 'บันทึกรับเอกสาร', checking: 'เริ่มตรวจสอบ',
      passed: 'ตรวจผ่าน', failed: 'ตรวจไม่ผ่าน', revision: 'ส่งกลับแก้ไข',
      issue: 'สร้างปัญหา', issue_resolved: 'แก้ไขปัญหาแล้ว', file_uploaded: 'อัปโหลดไฟล์',
      submitted: 'ยื่นหน่วยงาน', agency_response: 'ผลจากหน่วยงาน'
    };
    return labels[eventType] || eventType;
  };

  const formatDateTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6">
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-2">กำลังโหลด...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900">ประวัติการดำเนินงาน ({timeline.length} รายการ)</h3>
      </div>
      {timeline.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-slate-400">ยังไม่มีประวัติการดำเนินงาน</p>
        </div>
      ) : (
        <div className="px-6 py-4">
          {timeline.map((item, index) => {
            const { icon, color } = getEventIcon(item.event_type);
            const isLast = index === timeline.length - 1;
            return (
              <div key={item.id} className="relative" style={{ paddingLeft: '40px', paddingBottom: isLast ? '0' : '24px' }}>
                {!isLast && (
                  <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5" style={{ borderLeft: '2px dashed #10B981' }}></div>
                )}
                <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-sm`}>
                  {icon}
                </div>
                <div className="ml-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900">{getEventLabel(item.event_type)}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
                  </div>
                  {item.event_type === 'received' && item.event_data && (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>รับจาก: {item.event_data.received_from || '-'}</p>
                      <p>ช่องทาง: {item.event_data.received_channel || '-'}</p>
                      {item.event_data.file_reference && <p>ไฟล์: {item.event_data.file_reference}</p>}
                    </div>
                  )}
                  {item.event_type === 'failed' && item.event_data && item.event_data.action && (
                    <p className="text-xs text-red-600 mt-1">{item.event_data.action}</p>
                  )}
                  {item.event_type === 'issue' && item.event_data && (
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs">{item.event_data.issue_source || 'ตรวจสอบภายใน'}</span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">ยังไม่แก้</span>
                    </div>
                  )}
                  {item.event_type === 'submitted' && item.event_data && (
                    <p className="text-xs text-slate-500 mt-1">ยื่นให้: {item.event_data.agency_name} (รอบ {item.event_data.round})</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">โดย: {item.performer_name || 'ไม่ระบุ'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
