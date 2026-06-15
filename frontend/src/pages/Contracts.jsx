import { FileText, Plus, Edit2, Trash2, Search, X, Save } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { contractsAPI, customersAPI, projectsAPI } from '../utils/api';
import { CONTRACT_STATUSES } from '../utils/constants';

const formatDate = (v) => (v ? new Date(v).toLocaleDateString('th-TH') : '-');

const formatCurrency = (v) => {
  if (v == null || v === '') return '-';
  return Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const emptyForm = {
  customer_id: '',
  project_id: '',
  contract_number: '',
  status: 'draft',
  start_date: '',
  end_date: '',
  signed_date: '',
  total_value: '',
  notes: '',
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ---- data loading ---- */

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      const data = await contractsAPI.getAll(params);
      setContracts(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [custRes, projRes] = await Promise.all([
        customersAPI.getAll({ limit: 200 }),
        projectsAPI.getAll({ limit: 200 }),
      ]);
      setCustomers(Array.isArray(custRes) ? custRes : (custRes.data || []));
      setProjects(Array.isArray(projRes) ? projRes : (projRes.data || []));
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    }
  }, []);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  /* ---- modal handlers ---- */

  const openCreate = () => {
    setEditContract(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditContract(c);
    setForm({
      customer_id: c.customer_id || '',
      project_id: c.project_id || '',
      contract_number: c.contract_number || '',
      status: c.status || 'draft',
      start_date: c.start_date ? c.start_date.slice(0, 10) : '',
      end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      signed_date: c.signed_date ? c.signed_date.slice(0, 10) : '',
      total_value: c.total_value ?? '',
      notes: c.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        total_value: form.total_value !== '' ? Number(form.total_value) : null,
      };
      if (editContract) {
        await contractsAPI.update(editContract.id, payload);
      } else {
        await contractsAPI.create(payload);
      }
      setShowModal(false);
      loadContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบสัญญานี้?')) return;
    try {
      await contractsAPI.delete(id);
      loadContracts();
    } catch (err) {
      console.error('Failed to delete contract:', err);
    }
  };

  /* ---- render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">สัญญา</h1>
              <p className="mt-2 text-base text-slate-500">จัดการสัญญาทั้งหมดในระบบ</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            สร้างสัญญา
          </button>
        </div>
      </section>

      {/* Filter bar */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">ทุกสถานะ</option>
              {Object.entries(CONTRACT_STATUSES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </label>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">เลขที่สัญญา</th>
                <th className="px-5 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">ลูกค้า</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-right font-semibold">มูลค่า</th>
                <th className="px-5 py-4 text-left font-semibold">วันเริ่ม - วันสิ้นสุด</th>
                <th className="px-5 py-4 text-left font-semibold">วันเซ็น</th>
                <th className="px-5 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && contracts.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-slate-400">
                    ยังไม่มีสัญญาในระบบ
                  </td>
                </tr>
              )}

              {contracts.map((c) => {
                const statusInfo = CONTRACT_STATUSES[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-900">{c.contract_number || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{c.project_name || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{c.customer_name || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(c.total_value)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(c.start_date)} - {formatDate(c.end_date)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(c.signed_date)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50"
                          title="แก้ไข"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editContract ? 'แก้ไขสัญญา' : 'สร้างสัญญา'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Customer */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ลูกค้า</label>
                <select
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">เลือกลูกค้า</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>{cust.customer_name}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">โครงการ</label>
                <select
                  name="project_id"
                  value={form.project_id}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">เลือกโครงการ</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.project_name}</option>
                  ))}
                </select>
              </div>

              {/* Contract number + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">เลขที่สัญญา</label>
                  <input
                    type="text"
                    name="contract_number"
                    value={form.contract_number}
                    onChange={handleChange}
                    placeholder="เช่น C-2024-001"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">สถานะ</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    {Object.entries(CONTRACT_STATUSES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันเริ่ม</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันสิ้นสุด</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันเซ็น</label>
                  <input
                    type="date"
                    name="signed_date"
                    value={form.signed_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Total value */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">มูลค่าสัญญา (บาท)</label>
                <input
                  type="number"
                  name="total_value"
                  value={form.total_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">หมายเหตุ</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
