import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building2, Loader, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { organizationsAPI } from '../utils/api';
import { ORG_TYPES, STEP_LABELS, STATUS_LABELS, STATUS_COLORS, APPROVAL_STATUSES } from '../utils/constants';

const emptyForm = { org_name: '', org_type: 'erc' };

export default function Organizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [orgProjects, setOrgProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => { loadOrganizations(); }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const result = await organizationsAPI.getAll();
      setOrganizations(Array.isArray(result) ? result : (result.data || []));
    } catch (error) { console.error('Failed to load organizations:', error); }
    finally { setLoading(false); }
  };

  const toggleOrgProjects = async (orgId) => {
    if (expandedOrgId === orgId) { setExpandedOrgId(null); setOrgProjects([]); return; }
    try {
      setLoadingProjects(true);
      setExpandedOrgId(orgId);
      const result = await organizationsAPI.getProjects(orgId);
      setOrgProjects(Array.isArray(result) ? result : (result.data || []));
    } catch (error) { console.error('Failed to load org projects:', error); }
    finally { setLoadingProjects(false); }
  };

  const openCreateModal = () => { setEditingOrg(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEditModal = (org) => { setEditingOrg(org); setFormData({ org_name: org.org_name, org_type: org.org_type }); setIsModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingOrg) { await organizationsAPI.update(editingOrg.id, formData); }
      else { await organizationsAPI.create(formData); }
      await loadOrganizations();
      setIsModalOpen(false);
    } catch (error) { console.error('Failed to save organization:', error); alert('เกิดข้อผิดพลาด'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`ต้องการลบหน่วยงาน "${org.org_name}" หรือไม่?`)) return;
    try { await organizationsAPI.delete(org.id); await loadOrganizations(); }
    catch (error) { console.error('Failed to delete organization:', error); alert('ไม่สามารถลบหน่วยงานได้'); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">หน่วยงาน</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                จัดการรายชื่อหน่วยงานที่เกี่ยวข้องกับโครงการ เช่น กกพ. PEA MEA อบต.
              </p>
            </div>
          </div>
          <button onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus size={18} />เพิ่มหน่วยงาน
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">หน่วยงานทั้งหมด</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{organizations.length}</p>
        </div>
        {Object.entries(ORG_TYPES).map(([key, label]) => {
          const count = organizations.filter(o => o.org_type === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{count}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            <Loader size={20} className="animate-spin mx-auto mb-2" />กำลังโหลด...
          </div>
        ) : organizations.map(org => (
          <div key={org.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-900">{org.org_name}</h3>
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700">{ORG_TYPES[org.org_type] || org.org_type}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditModal(org)} className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-50" title="แก้ไข"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(org)} className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50" title="ลบ"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                <p className="text-sm text-slate-500">จำนวนโครงการ</p>
                <p className="text-3xl font-bold text-slate-900">{org.project_count || 0}</p>
              </div>
              <button onClick={() => toggleOrgProjects(org.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                ดูโครงการ <ChevronDown size={14} />
              </button>
            </div>
            {expandedOrgId === org.id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                {loadingProjects ? (
                  <div className="text-center py-3"><Loader size={16} className="animate-spin mx-auto text-slate-400" /></div>
                ) : orgProjects.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-2">ยังไม่มีโครงการ</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orgProjects.map(p => {
                      const apSt = APPROVAL_STATUSES[p.approval_status] || {};
                      return (
                        <div key={p.id} onClick={() => navigate(`/projects/${p.project_id}`)} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 cursor-pointer hover:bg-blue-50 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.project_name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-slate-500">{STEP_LABELS[p.current_step]}</p>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${apSt.color || 'bg-slate-100 text-slate-600'}`}>{apSt.label || p.approval_status || 'รออนุมัติ'}</span>
                            </div>
                          </div>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[p.project_status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABELS[p.project_status]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">{editingOrg ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อหน่วยงาน *</label>
                <input type="text" value={formData.org_name} onChange={(e) => setFormData(p => ({ ...p, org_name: e.target.value }))} required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" placeholder="เช่น สำนักงาน กกพ." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทหน่วยงาน *</label>
                <select value={formData.org_type} onChange={(e) => setFormData(p => ({ ...p, org_type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400">
                  {Object.entries(ORG_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">ยกเลิก</button>
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
