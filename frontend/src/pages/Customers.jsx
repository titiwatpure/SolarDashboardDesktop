import { useEffect, useState } from 'react';
import { UserCircle, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { customersAPI } from '../utils/api';
import { CUSTOMER_TYPES } from '../utils/constants';

const emptyForm = {
  customer_name: '', customer_type: '', contact_name: '',
  contact_phone: '', contact_email: '', tax_id: '', address: '', notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customersAPI.getAll({ search, limit: 200 });
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, [search]);

  const openCreate = () => { setEditCustomer(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({ ...emptyForm, ...c });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editCustomer) {
        await customersAPI.update(editCustomer.id, form);
      } else {
        await customersAPI.create(form);
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ลบลูกค้ารายนี้?')) return;
    try {
      await customersAPI.delete(id);
      loadCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <UserCircle size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">ลูกค้า</h1>
              <p className="mt-2 text-base text-slate-500">จัดการข้อมูลลูกค้าและผู้ว่าจ้างทั้งหมด</p>
            </div>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus size={18} /> เพิ่มลูกค้า
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อลูกค้า ผู้ติดต่อ เบอร์โทร..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">ชื่อลูกค้า</th>
                <th className="px-5 py-4 text-left font-semibold">ประเภท</th>
                <th className="px-5 py-4 text-left font-semibold">ผู้ติดต่อ</th>
                <th className="px-5 py-4 text-left font-semibold">เบอร์โทร</th>
                <th className="px-5 py-4 text-left font-semibold">อีเมล</th>
                <th className="px-5 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-5 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && customers.length === 0 && (
                <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500">ยังไม่มีข้อมูลลูกค้า</td></tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-medium text-slate-900">{c.customer_name}</td>
                  <td className="px-5 py-4 text-slate-600">{CUSTOMER_TYPES[c.customer_type] || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{c.contact_name || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{c.contact_phone || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{c.contact_email || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{c.project_count || 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="rounded-full p-2 text-blue-600 hover:bg-blue-50"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id)} className="rounded-full p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-card-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editCustomer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า *</label>
                <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                <select name="customer_type" value={form.customer_type || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="">ไม่ระบุ</option>
                  {Object.entries(CUSTOMER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ติดต่อ</label>
                  <input type="text" name="contact_name" value={form.contact_name || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                  <input type="text" name="contact_phone" value={form.contact_phone || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input type="email" name="contact_email" value={form.contact_email || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input type="text" name="tax_id" value={form.tax_id || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea name="address" value={form.address || ''} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea name="notes" value={form.notes || ''} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
