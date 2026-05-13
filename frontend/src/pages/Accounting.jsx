import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  DollarSign,
  AlertCircle,
  ChevronDown,
  CreditCard,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { accountingAPI, contractsAPI, projectsAPI } from '../utils/api';
import {
  PAYMENT_METHODS,
  INSTALLMENT_STATUSES,
  TRANSACTION_TYPES,
} from '../utils/constants';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const today = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (v) => {
  if (v == null || v === '') return '-';
  return Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const emptyTransactionForm = {
  type: 'expense',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: today(),
  payment_method: 'transfer',
  receipt_number: '',
};

const emptyInstallmentForm = {
  contract_id: '',
  project_id: '',
  installment_number: '',
  description: '',
  amount: '',
  due_date: '',
  notes: '',
};

const emptyBulkRow = () => ({
  description: '',
  amount: '',
  due_date: '',
  notes: '',
});

const INSTALLMENT_TEMPLATES = {
  '30-30-40': [
    { description: 'เงินมัดจำ 30%', pct: 30 },
    { description: 'งวดระหว่างงาน 30%', pct: 30 },
    { description: 'งวดส่งมอบ 40%', pct: 40 },
  ],
  '50-50': [
    { description: 'เงินมัดจำ 50%', pct: 50 },
    { description: 'งวดส่งมอบ 50%', pct: 50 },
  ],
  '100': [
    { description: 'ชำระเต็มจำนวน', pct: 100 },
  ],
};

const emptyPayForm = {
  paid_amount: '',
  paid_date: today(),
  payment_method: 'transfer',
};

/* ---- KPI Card component ---- */
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 truncate">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---- Tab pill button ---- */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

/* ================================================================ */
/* MAIN COMPONENT                                                    */
/* ================================================================ */
export default function Accounting() {
  /* ---- shared state ---- */
  const [activeTab, setActiveTab] = useState('overview');
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---- tab 1: overview ---- */
  const [companySummary, setCompanySummary] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  /* ---- tab 2: project accounting ---- */
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSummary, setProjectSummary] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [txFilter, setTxFilter] = useState('all');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('');
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [txForm, setTxForm] = useState(emptyTransactionForm);
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState('');

  /* ---- tab 3: installments ---- */
  const [installments, setInstallments] = useState([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [instStatusFilter, setInstStatusFilter] = useState('');
  const [instProjectFilter, setInstProjectFilter] = useState('');
  const [showBulkInstModal, setShowBulkInstModal] = useState(false);
  const [bulkProject, setBulkProject] = useState('');
  const [bulkContract, setBulkContract] = useState('');
  const [bulkRows, setBulkRows] = useState([emptyBulkRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [contracts, setContracts] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  /* ============================================================ */
  /* DATA LOADING                                                  */
  /* ============================================================ */

  const loadCategories = useCallback(async () => {
    try {
      const data = await accountingAPI.getCategories({ limit: 200 });
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll({ limit: 1000 });
      setProjects(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, []);

  const loadCompanySummary = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await accountingAPI.getCompanySummary();
      setCompanySummary(data || null);
    } catch (err) {
      console.error('Failed to load company summary:', err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadCategories(), loadProjects(), loadCompanySummary()]);
      setLoading(false);
    };
    init();
  }, [loadCategories, loadProjects, loadCompanySummary]);

  /* ---- project summary ---- */
  const loadProjectSummary = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectSummary(null);
      return;
    }
    setProjectLoading(true);
    try {
      const data = await accountingAPI.getProjectSummary(projectId);
      setProjectSummary(data || null);
    } catch (err) {
      console.error('Failed to load project summary:', err);
      setProjectSummary(null);
    } finally {
      setProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'project' && selectedProjectId) {
      loadProjectSummary(selectedProjectId);
    }
  }, [activeTab, selectedProjectId, loadProjectSummary]);

  /* ---- installments ---- */
  const loadInstallments = useCallback(async () => {
    setInstallmentsLoading(true);
    try {
      const params = { limit: 500 };
      if (instStatusFilter) params.status = instStatusFilter;
      if (instProjectFilter) params.project_id = instProjectFilter;
      const data = await accountingAPI.getInstallments(params);
      setInstallments(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load installments:', err);
    } finally {
      setInstallmentsLoading(false);
    }
  }, [instStatusFilter, instProjectFilter]);

  useEffect(() => {
    if (activeTab === 'installments') {
      loadInstallments();
    }
  }, [activeTab, loadInstallments]);

  /* ============================================================ */
  /* MEMOIZED DATA                                                 */
  /* ============================================================ */

  const monthlyTrend = useMemo(() => {
    const trend = companySummary?.monthly_trend;
    if (!Array.isArray(trend)) return [];
    return trend.map((m) => ({
      month: m.month || m.label || '',
      income: Number(m.income || 0),
      expense: Number(m.expense || 0),
    }));
  }, [companySummary]);

  const topProjects = useMemo(() => {
    const tp = companySummary?.top_projects;
    if (!Array.isArray(tp)) return [];
    return tp;
  }, [companySummary]);

  const receivables = useMemo(() => {
    const rec = companySummary?.receivables;
    if (Array.isArray(rec)) return rec;
    return installments.filter((i) => i.status === 'pending' || i.status === 'overdue');
  }, [companySummary, installments]);

  const filteredTransactions = useMemo(() => {
    const txs = projectSummary?.transactions;
    if (!Array.isArray(txs)) return [];
    return txs.filter((t) => {
      if (txFilter !== 'all' && t.type !== txFilter) return false;
      if (txCategoryFilter && t.category_id !== txCategoryFilter) return false;
      if (txDateFrom && t.transaction_date < txDateFrom) return false;
      if (txDateTo && t.transaction_date > txDateTo) return false;
      return true;
    });
  }, [projectSummary, txFilter, txCategoryFilter, txDateFrom, txDateTo]);

  const filteredCategories = useMemo(() => {
    if (txForm.type === 'all') return categories;
    return categories.filter((c) => c.type === txForm.type);
  }, [categories, txForm.type]);

  const pieData = useMemo(() => {
    const bd = projectSummary?.category_breakdown;
    if (!Array.isArray(bd)) return [];
    return bd.map((item, idx) => ({
      ...item,
      name: item.category_name || item.name || '-',
      value: Number(item.total || item.amount || 0),
      fill: COLORS[idx % COLORS.length],
    }));
  }, [projectSummary]);

  /* ============================================================ */
  /* TRANSACTION HANDLERS                                          */
  /* ============================================================ */

  const openCreateTx = () => {
    setEditTx(null);
    setTxForm({ ...emptyTransactionForm, transaction_date: today() });
    setTxError('');
    setShowTxModal(true);
  };

  const openEditTx = (tx) => {
    setEditTx(tx);
    setTxForm({
      type: tx.type || 'expense',
      category_id: tx.category_id || '',
      amount: tx.amount ?? '',
      description: tx.description || '',
      transaction_date: tx.transaction_date ? tx.transaction_date.slice(0, 10) : today(),
      payment_method: tx.payment_method || 'transfer',
      receipt_number: tx.receipt_number || '',
    });
    setTxError('');
    setShowTxModal(true);
  };

  const handleTxChange = (e) => {
    const { name, value } = e.target;
    setTxForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'type') next.category_id = '';
      return next;
    });
  };

  const handleTxSave = async (e) => {
    e.preventDefault();
    if (!txForm.category_id || !txForm.amount) {
      setTxError('กรุณากรอกข้อมูลที่จำเป็น');
      return;
    }
    setTxSaving(true);
    setTxError('');
    try {
      const payload = {
        ...txForm,
        project_id: selectedProjectId,
        amount: Number(txForm.amount),
      };
      if (editTx) {
        await accountingAPI.updateTransaction(editTx.id, payload);
      } else {
        await accountingAPI.createTransaction(payload);
      }
      setShowTxModal(false);
      loadProjectSummary(selectedProjectId);
    } catch (err) {
      setTxError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setTxSaving(false);
    }
  };

  const handleTxDelete = async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return;
    try {
      await accountingAPI.deleteTransaction(id);
      loadProjectSummary(selectedProjectId);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  /* ============================================================ */
  /* INSTALLMENT HANDLERS                                          */
  /* ============================================================ */

  const openCreateInst = async () => {
    setBulkProject('');
    setBulkContract('');
    setBulkRows([emptyBulkRow()]);
    setBulkError('');
    setShowBulkInstModal(true);
    try {
      const res = await contractsAPI.getAll({ limit: 200 });
      setContracts(Array.isArray(res) ? res : res?.data || []);
    } catch { setContracts([]); }
  };

  const applyTemplate = (key) => {
    const tpl = INSTALLMENT_TEMPLATES[key];
    if (!tpl) return;
    setBulkRows(tpl.map((t) => ({ ...emptyBulkRow(), description: t.description })));
  };

  const addBulkRow = () => setBulkRows((prev) => [...prev, emptyBulkRow()]);
  const removeBulkRow = (idx) => setBulkRows((prev) => prev.filter((_, i) => i !== idx));
  const updateBulkRow = (idx, field, value) => {
    setBulkRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const applyAmountPct = (idx, pct) => {
    const contract = contracts.find((c) => c.id === bulkContract);
    if (!contract?.total_amount) return;
    const amt = Math.round((Number(contract.total_amount) * pct) / 100);
    updateBulkRow(idx, 'amount', String(amt));
  };

  const handleBulkSave = async () => {
    if (!bulkProject) { setBulkError('กรุณาเลือกโครงการ'); return; }
    const validRows = bulkRows.filter((r) => r.amount && Number(r.amount) > 0);
    if (validRows.length === 0) { setBulkError('กรุณากรอกจำนวนเงินอย่างน้อย 1 งวด'); return; }
    setBulkSaving(true);
    setBulkError('');
    try {
      await accountingAPI.bulkInstallments({
        project_id: bulkProject,
        contract_id: bulkContract || null,
        installments: validRows.map((r) => ({
          description: r.description || null,
          amount: Number(r.amount),
          due_date: r.due_date || null,
          notes: r.notes || null,
        })),
      });
      setShowBulkInstModal(false);
      loadInstallments();
    } catch (err) {
      setBulkError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleInstDelete = async (id) => {
    if (!window.confirm('ต้องการลบงวดชำระนี้?')) return;
    try {
      await accountingAPI.deleteInstallment(id);
      loadInstallments();
    } catch (err) {
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาด';
      alert(msg);
    }
  };

  const openPayModal = (inst) => {
    setPayTarget(inst);
    const remaining = (inst.amount || 0) - (inst.paid_amount || 0);
    setPayForm({
      paid_amount: remaining > 0 ? remaining : (inst.amount ?? ''),
      paid_date: today(),
      payment_method: 'transfer',
    });
    setPayError('');
    setShowPayModal(true);
  };

  const handlePayChange = (e) => {
    const { name, value } = e.target;
    setPayForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaySave = async (e) => {
    e.preventDefault();
    if (!payForm.paid_amount) {
      setPayError('กรุณากรอกจำนวนเงินที่ชำระ');
      return;
    }
    setPaySaving(true);
    setPayError('');
    try {
      await accountingAPI.payInstallment(payTarget.id, {
        ...payForm,
        paid_amount: Number(payForm.paid_amount),
      });
      setShowPayModal(false);
      loadInstallments();
    } catch (err) {
      setPayError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกชำระ');
    } finally {
      setPaySaving(false);
    }
  };

  /* ============================================================ */
  /* LOADING STATE                                                 */
  /* ============================================================ */

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  /* ============================================================ */
  /* RENDER                                                        */
  /* ============================================================ */

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">บัญชี</h1>
              <p className="mt-2 text-base text-slate-500">
                จัดการรายรับรายจ่าย งบประมาณโครงการ และงวดชำระ
              </p>
            </div>
          </div>
        </div>

        {/* Tab pills */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            สรุปภาพรวม
          </TabButton>
          <TabButton active={activeTab === 'project'} onClick={() => setActiveTab('project')}>
            บัญชีโครงการ
          </TabButton>
          <TabButton active={activeTab === 'installments'} onClick={() => setActiveTab('installments')}>
            งวดชำระ
          </TabButton>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW                                               */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <OverviewTab
          loading={overviewLoading}
          summary={companySummary}
          monthlyTrend={monthlyTrend}
          topProjects={topProjects}
          receivables={receivables}
        />
      )}

      {/* ============================================================ */}
      {/* TAB 2: PROJECT ACCOUNTING                                     */}
      {/* ============================================================ */}
      {activeTab === 'project' && (
        <ProjectTab
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          summary={projectSummary}
          loading={projectLoading}
          txFilter={txFilter}
          onTxFilterChange={setTxFilter}
          categories={categories}
          txCategoryFilter={txCategoryFilter}
          onTxCategoryFilterChange={setTxCategoryFilter}
          txDateFrom={txDateFrom}
          onTxDateFromChange={setTxDateFrom}
          txDateTo={txDateTo}
          onTxDateToChange={setTxDateTo}
          filteredTransactions={filteredTransactions}
          pieData={pieData}
          onAddTx={openCreateTx}
          onEditTx={openEditTx}
          onDeleteTx={handleTxDelete}
        />
      )}

      {/* ============================================================ */}
      {/* TAB 3: INSTALLMENTS                                           */}
      {/* ============================================================ */}
      {activeTab === 'installments' && (
        <InstallmentsTab
          installments={installments}
          loading={installmentsLoading}
          statusFilter={instStatusFilter}
          onStatusFilterChange={setInstStatusFilter}
          projects={projects}
          instProjectFilter={instProjectFilter}
          onInstProjectFilterChange={setInstProjectFilter}
          onCreate={openCreateInst}
          onPay={openPayModal}
          onDelete={handleInstDelete}
        />
      )}

      {/* ============================================================ */}
      {/* TRANSACTION MODAL                                             */}
      {/* ============================================================ */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editTx ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {txError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {txError}
              </div>
            )}

            <form onSubmit={handleTxSave} className="space-y-4">
              {/* Type radio */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">ประเภท</label>
                <div className="flex gap-3">
                  {Object.entries(TRANSACTION_TYPES).map(([key, { label, bg, color }]) => (
                    <label
                      key={key}
                      className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition ${
                        txForm.type === key
                          ? `${bg} ${color} border-current`
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={key}
                        checked={txForm.type === key}
                        onChange={handleTxChange}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">หมวดหมู่ *</label>
                <select
                  name="category_id"
                  value={txForm.category_id}
                  onChange={handleTxChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  name="amount"
                  value={txForm.amount}
                  onChange={handleTxChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียด</label>
                <input
                  type="text"
                  name="description"
                  value={txForm.description}
                  onChange={handleTxChange}
                  placeholder="รายละเอียดรายการ..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Date + Payment method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันที่</label>
                  <input
                    type="date"
                    name="transaction_date"
                    value={txForm.transaction_date}
                    onChange={handleTxChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วิธีชำระ</label>
                  <select
                    name="payment_method"
                    value={txForm.payment_method}
                    onChange={handleTxChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Receipt number */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">เลขที่ใบเสร็จ (ถ้ามี)</label>
                <input
                  type="text"
                  name="receipt_number"
                  value={txForm.receipt_number}
                  onChange={handleTxChange}
                  placeholder="REC-001"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={txSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {txSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BULK CREATE INSTALLMENT MODAL                                  */}
      {/* ============================================================ */}
      {showBulkInstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">สร้างแผนงวดชำระ</h3>
              <button
                onClick={() => setShowBulkInstModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {bulkError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bulkError}
              </div>
            )}

            <div className="space-y-4">
              {/* Project + Contract */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">โครงการ *</label>
                  <select
                    value={bulkProject}
                    onChange={(e) => setBulkProject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">เลือกโครงการ</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">สัญญา (ไม่บังคับ)</label>
                  <select
                    value={bulkContract}
                    onChange={(e) => setBulkContract(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">ไม่ผูกสัญญา</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>{c.contract_number || c.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Templates */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">แม่แบบ:</span>
                {Object.entries(INSTALLMENT_TEMPLATES).map(([key]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {key.replace('-', '/')}
                  </button>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {bulkRows.map((row, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">งวดที่ {idx + 1}</span>
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkRow(idx)}
                          className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="รายละเอียด (เช่น เงินมัดจำ)"
                        value={row.description}
                        onChange={(e) => updateBulkRow(idx, 'description', e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="จำนวนเงิน"
                          value={row.amount}
                          onChange={(e) => updateBulkRow(idx, 'amount', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                        {bulkContract && (
                          <div className="relative group">
                            <button
                              type="button"
                              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => {}}
                            >
                              %
                            </button>
                            <div className="absolute right-0 top-full z-10 hidden w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg group-hover:block">
                              {[10, 20, 30, 40, 50, 100].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => applyAmountPct(idx, pct)}
                                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-blue-50"
                                >
                                  {pct}% → {contracts.find((c) => c.id === bulkContract)?.total_amount
                                    ? formatCurrency(Math.round((Number(contracts.find((c) => c.id === bulkContract).total_amount) * pct) / 100))
                                    : '—'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        placeholder="วันครบกำหนด"
                        value={row.due_date}
                        onChange={(e) => updateBulkRow(idx, 'due_date', e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                      <input
                        type="text"
                        placeholder="หมายเหตุ"
                        value={row.notes}
                        onChange={(e) => updateBulkRow(idx, 'notes', e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row + Total */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addBulkRow}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus size={14} />
                  เพิ่มงวด
                </button>
                <div className="text-sm text-slate-600">
                  รวม: <span className="font-bold text-slate-900">{formatCurrency(bulkRows.reduce((s, r) => s + Number(r.amount || 0), 0))}</span> บาท
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkInstModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={bulkSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {bulkSaving ? 'กำลังบันทึก...' : 'สร้างงวดชำระทั้งหมด'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PAY INSTALLMENT MODAL                                         */}
      {/* ============================================================ */}
      {showPayModal && payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">บันทึกชำระ</h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500">งวดที่ {payTarget.installment_number || '-'}</p>
              <p className="font-semibold text-slate-900">{payTarget.description || '-'}</p>
              <p className="mt-1 text-slate-500">
                จำนวนเงิน:{' '}
                <span className="font-semibold text-slate-700">{formatCurrency(payTarget.amount)} บาท</span>
              </p>
              {payTarget.paid_amount > 0 && (
                <p className="mt-1 text-slate-500">
                  ชำระแล้ว: <span className="font-semibold text-blue-600">{formatCurrency(payTarget.paid_amount)} บาท</span>
                  {' '}| เหลือ: <span className="font-semibold text-orange-600">{formatCurrency(payTarget.amount - payTarget.paid_amount)} บาท</span>
                </p>
              )}
            </div>

            {payError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {payError}
              </div>
            )}

            <form onSubmit={handlePaySave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงินที่ชำระ (บาท) *</label>
                <input
                  type="number"
                  name="paid_amount"
                  value={payForm.paid_amount}
                  onChange={handlePayChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันที่ชำระ</label>
                  <input
                    type="date"
                    name="paid_date"
                    value={payForm.paid_date}
                    onChange={handlePayChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วิธีชำระ</label>
                  <select
                    name="payment_method"
                    value={payForm.payment_method}
                    onChange={handlePayChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={paySaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {paySaving ? 'กำลังบันทึก...' : 'บันทึกชำระ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/* TAB 1: OVERVIEW                                                   */
/* ================================================================ */
function OverviewTab({ loading, summary, monthlyTrend, topProjects, receivables }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const totalIncome = summary?.total_income ?? 0;
  const totalExpense = summary?.total_expense ?? 0;
  const netProfit = totalIncome - totalExpense;
  const totalReceivables = summary?.total_receivables ?? receivables.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="รายรับรวม"
          value={`${formatCurrency(totalIncome)} บาท`}
        />
        <KpiCard
          icon={TrendingDown}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="รายจ่ายรวม"
          value={`${formatCurrency(totalExpense)} บาท`}
        />
        <KpiCard
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="กำไรสุทธิ"
          value={`${formatCurrency(netProfit)} บาท`}
        />
        <KpiCard
          icon={AlertCircle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          label="ลูกหนี้"
          value={`${formatCurrency(totalReceivables)} บาท`}
          sub={`${receivables.length} งวดรอชำระ`}
        />
      </div>

      {/* Monthly trend chart */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">แนวโน้มรายเดือน</h2>
          <p className="mt-1 text-sm text-slate-500">รายรับและรายจ่าย 12 เดือนย้อนหลัง</p>
        </div>
        {monthlyTrend.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            ยังไม่มีข้อมูล
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#1e293b' }}
                />
                <Bar dataKey="income" stackId="a" fill="#10b981" name="รายรับ" radius={[0, 0, 0, 0]} />
                <Bar dataKey="expense" stackId="b" fill="#ef4444" name="รายจ่าย" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Top projects + Receivables */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Top 5 profitable projects */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">โครงการที่กำไรมากที่สุด</h2>
            <p className="mt-1 text-sm text-slate-500">Top 5 โครงการที่มีกำไรมากที่สุด</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                  <th className="px-4 py-3 text-right font-semibold">รายรับ</th>
                  <th className="px-4 py-3 text-right font-semibold">รายจ่าย</th>
                  <th className="px-4 py-3 text-right font-semibold">กำไร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {topProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      ยังไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  topProjects.slice(0, 5).map((p, idx) => (
                    <tr key={p.project_id || idx} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.project_name || '-'}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(p.income)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(p.expense)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">
                        {formatCurrency((p.income || 0) - (p.expense || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receivables */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">ลูกหนี้</h2>
            <p className="mt-1 text-sm text-slate-500">งวดชำระที่ยังไม่ได้ชำระหรือเกินกำหนด</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                  <th className="px-4 py-3 text-left font-semibold">งวดที่</th>
                  <th className="px-4 py-3 text-right font-semibold">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-left font-semibold">ครบกำหนด</th>
                  <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      ไม่มีลูกหนี้
                    </td>
                  </tr>
                ) : (
                  receivables.slice(0, 10).map((r, idx) => {
                    const statusInfo = INSTALLMENT_STATUSES[r.status] || {
                      label: r.status,
                      color: 'bg-slate-100 text-slate-700',
                    };
                    return (
                      <tr key={r.id || idx} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.project_name || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{r.installment_number || '-'}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{r.due_date ? formatDate(r.due_date) : <span className="italic text-slate-400">ยังไม่กำหนด</span>}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================================================================ */
/* TAB 2: PROJECT ACCOUNTING                                         */
/* ================================================================ */
function ProjectTab({
  projects,
  selectedProjectId,
  onSelectProject,
  summary,
  loading,
  txFilter,
  onTxFilterChange,
  categories,
  txCategoryFilter,
  onTxCategoryFilterChange,
  txDateFrom,
  onTxDateFromChange,
  txDateTo,
  onTxDateToChange,
  filteredTransactions,
  pieData,
  onAddTx,
  onEditTx,
  onDeleteTx,
}) {
  return (
    <div className="space-y-6">
      {/* Project selector */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">เลือกโครงการ</h2>
            <p className="mt-1 text-sm text-slate-500">เลือกโครงการเพื่อดูรายละเอียดบัญชี</p>
          </div>
          <div className="relative w-full sm:w-80">
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">-- เลือกโครงการ --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </section>

      {/* No project selected */}
      {!selectedProjectId && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-12 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Wallet size={28} />
            </div>
            <p className="text-lg font-semibold text-slate-700">กรุณาเลือกโครงการ</p>
            <p className="mt-1 text-sm text-slate-400">เลือกโครงการจากด้านบนเพื่อดูข้อมูลบัญชี</p>
          </div>
        </section>
      )}

      {/* Loading */}
      {selectedProjectId && loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">กำลังโหลดข้อมูลโครงการ...</p>
          </div>
        </div>
      )}

      {/* Project summary */}
      {selectedProjectId && !loading && summary && (
        <>
          {/* KPI cards */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              icon={TrendingUp}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              label="รายรับ"
              value={formatCurrency(summary.total_income)}
            />
            <KpiCard
              icon={TrendingDown}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              label="รายจ่าย"
              value={formatCurrency(summary.total_expense)}
            />
            <KpiCard
              icon={DollarSign}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="กำไร"
              value={formatCurrency((summary.total_income || 0) - (summary.total_expense || 0))}
            />
            <KpiCard
              icon={Receipt}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              label="Margin %"
              value={
                summary.total_income
                  ? `${((((summary.total_income || 0) - (summary.total_expense || 0)) / summary.total_income) * 100).toFixed(1)}%`
                  : '0%'
              }
            />
            {/* Budget card with progress bar */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">งบประมาณ</p>
                  <p className="text-lg font-bold text-slate-900">
                    {summary.budget ? formatCurrency(summary.budget) : '-'}
                  </p>
                </div>
              </div>
              {summary.budget > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>ใช้ไป</span>
                    <span>{Math.min(100, (((summary.total_expense || 0) / summary.budget) * 100)).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (summary.total_expense || 0) / summary.budget > 0.9
                          ? 'bg-red-500'
                          : (summary.total_expense || 0) / summary.budget > 0.7
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((summary.total_expense || 0) / summary.budget) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown + Pie chart */}
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">สรุปตามหมวดหมู่</h2>
                <p className="mt-1 text-sm text-slate-500">รายรับและรายจ่ายแยกตามหมวดหมู่</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left font-semibold">ประเภท</th>
                      <th className="px-4 py-3 text-right font-semibold">จำนวนเงิน</th>
                      <th className="px-4 py-3 text-right font-semibold">จำนวนรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {!Array.isArray(summary.category_breakdown) || summary.category_breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          ยังไม่มีข้อมูล
                        </td>
                      </tr>
                    ) : (
                      summary.category_breakdown.map((cat, idx) => {
                        const typeInfo = TRANSACTION_TYPES[cat.type] || {};
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {cat.category_name || cat.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  typeInfo.bg || 'bg-slate-100'
                                } ${typeInfo.color || 'text-slate-600'}`}
                              >
                                {typeInfo.label || cat.type || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {formatCurrency(cat.total || cat.amount)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500">{cat.count || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie chart */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">สัดส่วนหมวดหมู่</h2>
                <p className="mt-1 text-sm text-slate-500">สัดส่วนจำนวนเงินแยกตามหมวดหมู่</p>
              </div>
              {pieData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                  ยังไม่มีข้อมูล
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Legend */}
              {pieData.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {pieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Transactions table */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">รายการบัญชี</h2>
                <p className="mt-1 text-sm text-slate-500">รายการรายรับ-รายจ่ายทั้งหมดของโครงการ</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Type filter */}
                <select
                  value={txFilter}
                  onChange={(e) => onTxFilterChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="income">รายรับ</option>
                  <option value="expense">รายจ่าย</option>
                </select>
                {/* Category filter */}
                <select
                  value={txCategoryFilter}
                  onChange={(e) => onTxCategoryFilterChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {/* Date from */}
                <input
                  type="date"
                  value={txDateFrom}
                  onChange={(e) => onTxDateFromChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  title="จากวันที่"
                />
                <span className="text-sm text-slate-400">ถึง</span>
                {/* Date to */}
                <input
                  type="date"
                  value={txDateTo}
                  onChange={(e) => onTxDateToChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  title="ถึงวันที่"
                />
                <button
                  onClick={onAddTx}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  เพิ่มรายการ
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">วันที่</th>
                    <th className="px-4 py-3 text-left font-semibold">ประเภท</th>
                    <th className="px-4 py-3 text-left font-semibold">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left font-semibold">รายละเอียด</th>
                    <th className="px-4 py-3 text-right font-semibold">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-left font-semibold">วิธีชำระ</th>
                    <th className="px-4 py-3 text-left font-semibold">ใบเสร็จ</th>
                    <th className="px-4 py-3 text-center font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        ยังไม่มีรายการ
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const typeInfo = TRANSACTION_TYPES[tx.type] || {};
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-slate-700">{formatDate(tx.transaction_date)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                typeInfo.bg || 'bg-slate-100'
                              } ${typeInfo.color || 'text-slate-600'}`}
                            >
                              {typeInfo.label || tx.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{tx.category_name || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={tx.description || ''}>
                            {tx.description || '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {PAYMENT_METHODS[tx.payment_method] || tx.payment_method || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{tx.receipt_number || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditTx(tx)}
                                className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50"
                                title="แก้ไข"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => onDeleteTx(tx.id)}
                                className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                                title="ลบ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Empty state when project selected but no data */}
      {selectedProjectId && !loading && !summary && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-12 shadow-sm">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">ไม่พบข้อมูล</p>
            <p className="mt-1 text-sm text-slate-400">ไม่พบข้อมูลบัญชีสำหรับโครงการนี้</p>
          </div>
        </section>
      )}
    </div>
  );
}

/* ================================================================ */
/* TAB 3: INSTALLMENTS                                               */
/* ================================================================ */
function InstallmentsTab({
  installments,
  loading,
  statusFilter,
  onStatusFilterChange,
  projects,
  instProjectFilter,
  onInstProjectFilterChange,
  onCreate,
  onPay,
  onDelete,
}) {
  const rowColor = (status) => {
    if (status === 'paid') return 'bg-green-50/50';
    if (status === 'partial') return 'bg-blue-50/50';
    if (status === 'overdue') return 'bg-red-50/50';
    if (status === 'pending') return 'bg-yellow-50/50';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white sm:w-48"
              >
                <option value="">ทุกสถานะ</option>
                {Object.entries(INSTALLMENT_STATUSES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <div className="relative">
              <select
                value={instProjectFilter}
                onChange={(e) => onInstProjectFilterChange(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white sm:w-60"
              >
                <option value="">ทุกโครงการ</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <span className="text-sm text-slate-500">{installments.length} รายการ</span>
          </div>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            สร้างงวดชำระ
          </button>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">งวดที่</th>
                  <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                  <th className="px-4 py-3 text-left font-semibold">สัญญา</th>
                  <th className="px-4 py-3 text-left font-semibold">รายละเอียด</th>
                  <th className="px-4 py-3 text-right font-semibold">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-left font-semibold">ครบกำหนด</th>
                  <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                  <th className="px-4 py-3 text-right font-semibold">ชำระแล้ว</th>
                  <th className="px-4 py-3 text-left font-semibold">วันที่ชำระ</th>
                  <th className="px-4 py-3 text-center font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {installments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      ยังไม่มีงวดชำระในระบบ
                    </td>
                  </tr>
                ) : (
                  installments.map((inst) => {
                    const statusInfo = INSTALLMENT_STATUSES[inst.status] || {
                      label: inst.status,
                      color: 'bg-slate-100 text-slate-700',
                    };
                    return (
                      <tr key={inst.id} className={`hover:bg-slate-50/70 ${rowColor(inst.status)}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{inst.installment_number || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{inst.project_name || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{inst.contract_number || '-'}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={inst.description || ''}>
                          {inst.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(inst.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{inst.due_date ? formatDate(inst.due_date) : <span className="italic text-slate-400">ยังไม่กำหนด</span>}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {inst.paid_amount != null ? formatCurrency(inst.paid_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(inst.paid_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {(inst.status === 'pending' || inst.status === 'overdue' || inst.status === 'partial') && (
                              <button
                                onClick={() => onPay(inst)}
                                className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-50"
                                title="บันทึกชำระ"
                              >
                                <CreditCard size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(inst.id)}
                              className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                              title="ลบ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
