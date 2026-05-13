import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Edit2, Trash2, Send, CheckCircle, XCircle, Search, X, Save } from 'lucide-react';
import { quotationsAPI, customersAPI } from '../utils/api';
import { QUOTATION_STATUSES } from '../utils/constants';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const formatCurrency = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const blankItem = () => ({ description: '', quantity: 1, unit: '', unit_price: 0 });

const blankForm = () => ({
  customer_id: '',
  valid_until: '',
  notes: '',
  items: [blankItem()],
});

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Quotations() {
  /* ---------- data ---------- */
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------- filters ---------- */
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  /* ---------- modal ---------- */
  const [showModal, setShowModal] = useState(false);
  const [editQuotation, setEditQuotation] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ================================================================ */
  /*  Data loading                                                     */
  /* ================================================================ */

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await quotationsAPI.getAll(params);
      setQuotations(res?.data || []);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await customersAPI.getAll({ limit: 500 });
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  /* ================================================================ */
  /*  Modal helpers                                                    */
  /* ================================================================ */

  const openCreate = () => {
    setEditQuotation(null);
    setForm(blankForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (q) => {
    setEditQuotation(q);
    setForm({
      customer_id: q.customer_id || '',
      valid_until: q.valid_until ? q.valid_until.slice(0, 10) : '',
      notes: q.notes || '',
      items: q.items && q.items.length > 0
        ? q.items.map((it) => ({
            description: it.description || '',
            quantity: it.quantity ?? 1,
            unit: it.unit || '',
            unit_price: it.unit_price ?? 0,
          }))
        : [blankItem()],
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditQuotation(null);
    setError('');
  };

  /* ================================================================ */
  /*  Form change handlers                                             */
  /* ================================================================ */

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, blankItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  /* ---------- computed totals ---------- */
  const computeItemAmount = (item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unit_price) || 0;
    return q * p;
  };

  const subtotal = form.items.reduce((sum, it) => sum + computeItemAmount(it), 0);
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  /* ================================================================ */
  /*  Save                                                             */
  /* ================================================================ */

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      setError('กรุณาเลือกลูกค้า');
      return;
    }
    if (form.items.length === 0 || form.items.every((it) => !it.description.trim())) {
      setError('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const cleanItems = form.items.filter((it) => it.description.trim());
      const computedSubtotal = cleanItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
      const computedTax = computedSubtotal * 0.07;
      const computedTotal = computedSubtotal + computedTax;
      const payload = {
        customer_id: form.customer_id,
        valid_until: form.valid_until || null,
        notes: form.notes,
        subtotal: computedSubtotal,
        tax_rate: 7,
        tax_amount: computedTax,
        total_amount: computedTotal,
        items: cleanItems,
      };
      if (editQuotation) {
        await quotationsAPI.update(editQuotation.id, payload);
      } else {
        await quotationsAPI.create(payload);
      }
      closeModal();
      loadQuotations();
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  /* ================================================================ */
  /*  Status change                                                    */
  /* ================================================================ */

  const changeStatus = async (id, newStatus) => {
    const labels = { sent: 'ส่ง', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' };
    if (!window.confirm(`ยืนยัน${labels[newStatus] || 'เปลี่ยนสถานะ'}ใบเสนอราคานี้?`)) return;
    try {
      await quotationsAPI.changeStatus(id, newStatus);
      loadQuotations();
    } catch (err) {
      console.error('Failed to change status:', err);
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  /* ================================================================ */
  /*  Delete                                                           */
  /* ================================================================ */

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบใบเสนอราคานี้?')) return;
    try {
      await quotationsAPI.delete(id);
      loadQuotations();
    } catch (err) {
      console.error('Failed to delete quotation:', err);
    }
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">

      {/* ==================== Header ==================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">ใบเสนอราคา</h1>
              <p className="mt-2 text-base text-slate-500">จัดการใบเสนอราคาทั้งหมด สร้าง แก้ไข ส่ง และติดตามสถานะ</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} /> สร้างใบเสนอราคา
          </button>
        </div>
      </section>

      {/* ==================== Filter bar ==================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(QUOTATION_STATUSES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่, ลูกค้า..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </section>

      {/* ==================== Table ==================== */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">เลขที่</th>
                <th className="px-5 py-4 text-left font-semibold">ลูกค้า</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-right font-semibold">ยอดรวม</th>
                <th className="px-5 py-4 text-left font-semibold">วันหมดอายุ</th>
                <th className="px-5 py-4 text-left font-semibold">วันที่สร้าง</th>
                <th className="px-5 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">กำลังโหลด...</td>
                </tr>
              )}
              {!loading && quotations.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-500">ยังไม่มีใบเสนอราคา</td>
                </tr>
              )}
              {!loading && quotations.map((q) => {
                const status = QUOTATION_STATUSES[q.status] || { label: q.status, color: 'bg-gray-100 text-gray-800' };
                return (
                  <tr key={q.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-medium text-slate-900">{q.quote_number || q.id}</td>
                    <td className="px-5 py-4 text-slate-600">{q.customer_name || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-900 font-medium">
                      {formatCurrency(q.total_amount)} บาท
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(q.valid_until)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(q.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(q)} title="แก้ไข" className="rounded-full p-2 text-blue-600 hover:bg-blue-50">
                          <Edit2 size={16} />
                        </button>

                        {q.status === 'draft' && (
                          <button onClick={() => changeStatus(q.id, 'sent')} title="ส่ง" className="rounded-full p-2 text-indigo-600 hover:bg-indigo-50">
                            <Send size={16} />
                          </button>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <button onClick={() => changeStatus(q.id, 'approved')} title="อนุมัติ" className="rounded-full p-2 text-green-600 hover:bg-green-50">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => changeStatus(q.id, 'rejected')} title="ปฏิเสธ" className="rounded-full p-2 text-red-500 hover:bg-red-50">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        <button onClick={() => handleDelete(q.id)} title="ลบ" className="rounded-full p-2 text-red-500 hover:bg-red-50">
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

      {/* ==================== Create / Edit Modal ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative mx-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">
                {editQuotation ? 'แก้ไขใบเสนอราคา' : 'สร้างใบเสนอราคา'}
              </h2>
              <button onClick={closeModal} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {/* ---- Customer & valid_until ---- */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ลูกค้า *</label>
                  <select
                    name="customer_id"
                    value={form.customer_id}
                    onChange={handleField}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">-- เลือกลูกค้า --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.customer_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">วันหมดอายุ</label>
                  <input
                    type="date"
                    name="valid_until"
                    value={form.valid_until}
                    onChange={handleField}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* ---- Notes ---- */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">หมายเหตุ</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleField}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* ---- Items ---- */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">รายการ</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Plus size={14} /> เพิ่มรายการ
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, idx) => {
                    const amount = computeItemAmount(item);
                    return (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="mb-3 grid grid-cols-12 gap-3">
                          {/* description */}
                          <div className="col-span-12 sm:col-span-5">
                            {idx === 0 && <label className="mb-1 block text-xs font-medium text-slate-500">รายละเอียด</label>}
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="รายละเอียดรายการ"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                          {/* quantity */}
                          <div className="col-span-4 sm:col-span-2">
                            {idx === 0 && <label className="mb-1 block text-xs font-medium text-slate-500">จำนวน</label>}
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                          {/* unit */}
                          <div className="col-span-4 sm:col-span-1">
                            {idx === 0 && <label className="mb-1 block text-xs font-medium text-slate-500">หน่วย</label>}
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder="หน่วย"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                          {/* unit_price */}
                          <div className="col-span-4 sm:col-span-2">
                            {idx === 0 && <label className="mb-1 block text-xs font-medium text-slate-500">ราคา/หน่วย</label>}
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                          {/* amount (read-only) */}
                          <div className="col-span-4 sm:col-span-2 flex items-end gap-2">
                            <div className="flex-1">
                              {idx === 0 && <label className="mb-1 block text-xs font-medium text-slate-500">จำนวนเงิน</label>}
                              <div className="rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 text-right">
                                {formatCurrency(amount)}
                              </div>
                            </div>
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="flex-shrink-0 rounded-full p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                                title="ลบรายการ"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ---- Totals ---- */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>ราคารวม (ก่อน VAT)</span>
                    <span>{formatCurrency(subtotal)} บาท</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT 7%</span>
                    <span>{formatCurrency(tax)} บาท</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
                    <span>ยอดรวมทั้งสิ้น</span>
                    <span>{formatCurrency(total)} บาท</span>
                  </div>
                </div>
              </div>

              {/* ---- Actions ---- */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
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
