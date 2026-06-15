import { Plus, Edit2, Trash2, X, Users, Loader, Search, Star, Phone, Mail, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { organizationsAPI } from '../utils/api';

const CONTACT_ROLES = { reception: 'รับเรื่อง', engineer: 'วิศวกร', approver: 'ผู้อนุมัติ', finance: 'การเงิน', other: 'อื่นๆ' };
const CONTACT_ROLE_COLORS = { reception: 'bg-blue-100 text-blue-700', engineer: 'bg-green-100 text-green-700', approver: 'bg-purple-100 text-purple-700', finance: 'bg-amber-100 text-amber-700', other: 'bg-slate-100 text-slate-600' };

const emptyForm = { organization_id: '', full_name: '', position: '', department: '', phone: '', email: '', line_id: '', contact_role: 'other', is_primary: false, status: 'active', notes: '' };

export default function OrganizationContacts() {
  const [contacts, setContacts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterOrgType, setFilterOrgType] = useState('');
  const [filterPrimary, setFilterPrimary] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadOrganizations(); }, []);
  useEffect(() => { loadContacts(); }, [search, filterOrg, filterOrgType, filterPrimary, filterStatus]);

  const loadOrganizations = async () => {
    try {
      const result = await organizationsAPI.getAll();
      setOrganizations(Array.isArray(result) ? result : (result.data || []));
    } catch (e) { console.error(e); }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterOrg) params.organization_id = filterOrg;
      if (filterOrgType) params.org_type = filterOrgType;
      if (filterPrimary) params.is_primary = '1';
      if (filterStatus) params.status = filterStatus;
      const result = await organizationsAPI.getAllContacts(params);
      setContacts(Array.isArray(result) ? result : []);
    } catch (e) { console.error(e); setContacts([]); }
    finally { setLoading(false); }
  };

  const openModal = (contact = null) => {
    setEditingContact(contact);
    setForm(contact ? { ...emptyForm, ...contact, is_primary: Boolean(contact.is_primary) } : emptyForm);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.organization_id) { alert('กรุณาเลือกหน่วยงาน'); return; }
    setSaving(true);
    try {
      const payload = { ...form, is_primary: form.is_primary ? 1 : 0 };
      if (editingContact) {
        await organizationsAPI.updateContact(editingContact.organization_id, editingContact.id, payload);
      } else {
        await organizationsAPI.createContact(form.organization_id, payload);
      }
      await loadContacts();
      setModalOpen(false);
    } catch (err) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm(`ต้องการลบ "${contact.full_name}" หรือไม่?`)) return;
    try {
      await organizationsAPI.deleteContact(contact.organization_id, contact.id);
      await loadContacts();
    } catch (e) { alert('ไม่สามารถลบได้'); }
  };

  const handleSetPrimary = async (contact) => {
    try {
      await organizationsAPI.updateContact(contact.organization_id, contact.id, { is_primary: 1 });
      await loadContacts();
    } catch (e) { console.error(e); }
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.org_name : '-';
  };

  const getOrgType = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.org_type : '-';
  };

  const orgTypes = [...new Set(organizations.map(o => o.org_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">เจ้าหน้าที่หน่วยงาน</h1>
              <p className="mt-1 text-sm text-slate-500">จัดการรายชื่อเจ้าหน้าที่ของหน่วยงานภายนอกที่ต้องติดต่อ</p>
            </div>
          </div>
          <button onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition">
            <Plus size={16} />เพิ่มเจ้าหน้าที่
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 transition" />
          </div>
          <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400">
            <option value="">ทุกหน่วยงาน</option>
            {organizations.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
          </select>
          <select value={filterOrgType} onChange={(e) => setFilterOrgType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400">
            <option value="">ทุกประเภท</option>
            {orgTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400">
            <option value="">ทุกสถานะ</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={filterPrimary} onChange={(e) => setFilterPrimary(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300" />
            ผู้ติดต่อหลักเท่านั้น
          </label>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><Loader size={20} className="animate-spin mx-auto text-slate-400" /></div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">ยังไม่มีเจ้าหน้าที่</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3 text-left font-medium">ตำแหน่ง</th>
                  <th className="px-4 py-3 text-left font-medium">ฝ่าย/กอง</th>
                  <th className="px-4 py-3 text-left font-medium">หน่วยงาน</th>
                  <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                  <th className="px-4 py-3 text-left font-medium">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left font-medium">อีเมล</th>
                  <th className="px-4 py-3 text-left font-medium">Line ID</th>
                  <th className="px-4 py-3 text-left font-medium">บทบาท</th>
                  <th className="px-4 py-3 text-center font-medium">หลัก</th>
                  <th className="px-4 py-3 text-center font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 ${c.status === 'inactive' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {c.is_primary ? <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" /> : null}
                        {c.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.position || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.department || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.org_name || getOrgName(c.organization_id)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.org_type || getOrgType(c.organization_id)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.line_id || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-medium ${CONTACT_ROLE_COLORS[c.contact_role] || CONTACT_ROLE_COLORS.other}`}>
                        {CONTACT_ROLES[c.contact_role] || 'อื่นๆ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.is_primary ? <Star size={14} className="text-amber-500 fill-amber-500 mx-auto" />
                        : <button onClick={() => handleSetPrimary(c)} className="text-slate-300 hover:text-amber-500 transition" title="ตั้งเป็นหลัก"><Star size={14} /></button>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openModal(c)} className="rounded p-1 text-blue-500 hover:bg-blue-50" title="แก้ไข"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(c)} className="rounded p-1 text-red-500 hover:bg-red-50" title="ลบ"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">{editingContact ? 'แก้ไขเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่ใหม่'}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">หน่วยงาน *</label>
                  <select value={form.organization_id} onChange={(e) => setForm(p => ({ ...p, organization_id: e.target.value }))}
                    required disabled={!!editingContact}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-100">
                    <option value="">เลือกหน่วยงาน</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่ง</label>
                  <input type="text" value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ฝ่าย/กอง/แผนก</label>
                  <input type="text" value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทร</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">อีเมล</label>
                  <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Line ID</label>
                  <input type="text" value={form.line_id} onChange={(e) => setForm(p => ({ ...p, line_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">บทบาทการติดต่อ</label>
                  <select value={form.contact_role} onChange={(e) => setForm(p => ({ ...p, contact_role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                    {Object.entries(CONTACT_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">สถานะ</label>
                  <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm(p => ({ ...p, is_primary: e.target.checked }))} className="w-4 h-4 rounded border-slate-300" />
                    <span className="text-sm text-slate-700">ตั้งเป็นผู้ติดต่อหลัก</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? <><Loader size={14} className="animate-spin" /> กำลังบันทึก...</> : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
