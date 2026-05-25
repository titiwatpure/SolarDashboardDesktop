import { useCallback, useEffect, useMemo, useState } from 'react';
import { accountingAPI, contractsAPI } from '../utils/api';

const today = () => new Date().toISOString().slice(0, 10);

const emptyTransactionForm = {
  type: 'expense',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: today(),
  payment_method: 'transfer',
  receipt_number: '',
};

const emptyPayForm = {
  paid_amount: '',
  paid_date: today(),
  payment_method: 'transfer',
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function useAccountingOverview() {
  const [companySummary, setCompanySummary] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

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
    loadCompanySummary();
  }, [loadCompanySummary]);

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
    return [];
  }, [companySummary]);

  return {
    companySummary,
    overviewLoading,
    loadCompanySummary,
    monthlyTrend,
    topProjects,
    receivables,
  };
}

export function useProjectAccounting(projectId) {
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

  const loadProjectSummary = useCallback(async (pid) => {
    if (!pid) {
      setProjectSummary(null);
      return;
    }
    setProjectLoading(true);
    try {
      const data = await accountingAPI.getProjectSummary(pid);
      setProjectSummary(data || null);
    } catch (err) {
      console.error('Failed to load project summary:', err);
      setProjectSummary(null);
    } finally {
      setProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectSummary(projectId);
    }
  }, [projectId, loadProjectSummary]);

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

  const openCreateTx = useCallback(() => {
    setEditTx(null);
    setTxForm({ ...emptyTransactionForm, transaction_date: today() });
    setTxError('');
    setShowTxModal(true);
  }, []);

  const openEditTx = useCallback((tx) => {
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
  }, []);

  const handleTxChange = useCallback((e) => {
    const { name, value } = e.target;
    setTxForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'type') next.category_id = '';
      return next;
    });
  }, []);

  const handleTxSave = useCallback(async (e) => {
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
        project_id: projectId,
        amount: Number(txForm.amount),
      };
      if (editTx) {
        await accountingAPI.updateTransaction(editTx.id, payload);
      } else {
        await accountingAPI.createTransaction(payload);
      }
      setShowTxModal(false);
      loadProjectSummary(projectId);
    } catch (err) {
      setTxError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setTxSaving(false);
    }
  }, [txForm, editTx, projectId, loadProjectSummary]);

  const handleTxDelete = useCallback(async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return;
    try {
      await accountingAPI.deleteTransaction(id);
      loadProjectSummary(projectId);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  }, [projectId, loadProjectSummary]);

  return {
    projectSummary,
    projectLoading,
    txFilter,
    setTxFilter,
    txDateFrom,
    setTxDateFrom,
    txDateTo,
    setTxDateTo,
    txCategoryFilter,
    setTxCategoryFilter,
    showTxModal,
    setShowTxModal,
    editTx,
    txForm,
    txSaving,
    txError,
    filteredTransactions,
    pieData,
    openCreateTx,
    openEditTx,
    handleTxChange,
    handleTxSave,
    handleTxDelete,
  };
}

export function useInstallments({ onPaymentSuccess } = {}) {
  const [installments, setInstallments] = useState([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [instStatusFilter, setInstStatusFilter] = useState('');
  const [instProjectFilter, setInstProjectFilter] = useState('');
  const [showBulkInstModal, setShowBulkInstModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

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
    loadInstallments();
  }, [loadInstallments]);

  const loadContracts = useCallback(async () => {
    try {
      const res = await contractsAPI.getAll({ limit: 200 });
      setContracts(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setContracts([]);
    }
  }, []);

  const handleInstDelete = useCallback(async (id) => {
    if (!window.confirm('ต้องการลบงวดชำระนี้?')) return;
    try {
      await accountingAPI.deleteInstallment(id);
      loadInstallments();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || 'เกิดข้อผิดพลาด';
      // ถ้ามี transaction เชื่อมอยู่ ถามว่าต้องการลบทั้งหมดไหม
      if (data?.transaction_id) {
        const txInfo = data.transaction_info;
        const txDesc = txInfo ? `(${txInfo.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${Number(txInfo.amount).toLocaleString()} บาท)` : '';
        const force = window.confirm(`${msg}\n\n${txDesc}\n\nต้องการลบทั้งงวดชำระและรายการบัญชีนี้เลยไหม?`);
        if (force) {
          try {
            await accountingAPI.deleteInstallment(id, true);
            loadInstallments();
          } catch (err2) {
            alert(err2.response?.data?.error || 'เกิดข้อผิดพลาด');
          }
        }
      } else {
        alert(msg);
      }
    }
  }, [loadInstallments]);

  const openPayModal = useCallback((inst) => {
    setPayTarget(inst);
    const remaining = (inst.amount || 0) - (inst.paid_amount || 0);
    setPayForm({
      paid_amount: remaining > 0 ? remaining : (inst.amount ?? ''),
      paid_date: today(),
      payment_method: 'transfer',
    });
    setPayError('');
    setShowPayModal(true);
  }, []);

  const handlePayChange = useCallback((e) => {
    const { name, value } = e.target;
    setPayForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePaySave = useCallback(async (e) => {
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
      if (onPaymentSuccess) onPaymentSuccess(payTarget.project_id);
    } catch (err) {
      setPayError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกชำระ');
    } finally {
      setPaySaving(false);
    }
  }, [payForm, payTarget, loadInstallments]);

  return {
    installments,
    installmentsLoading,
    instStatusFilter,
    setInstStatusFilter,
    instProjectFilter,
    setInstProjectFilter,
    showBulkInstModal,
    setShowBulkInstModal,
    contracts,
    loadContracts,
    showPayModal,
    setShowPayModal,
    payTarget,
    payForm,
    paySaving,
    payError,
    handleInstDelete,
    openPayModal,
    handlePayChange,
    handlePaySave,
    loadInstallments,
  };
}
