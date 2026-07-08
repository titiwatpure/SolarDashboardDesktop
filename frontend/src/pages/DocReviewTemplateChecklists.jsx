/**
 * DocReviewTemplateChecklists - จัดการ Template Checklist สำหรับเอกสารยื่นขออนุญาต
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';
import { useToast } from '../components/Toast';

const PERMIT_TYPES = [];

export default function DocReviewTemplateChecklists() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPermitType, setFilterPermitType] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [permitTypes, setPermitTypes] = useState([]);
  const [agencies, setAgencies] = useState([]);

  useEffect(() => {
    loadTemplates();
    loadPermitTypes();
    loadAgencies();
  }, [search, filterPermitType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterPermitType) params.permit_type = filterPermitType;
      const result = await documentReviewAPI.getTemplateChecklists(params);
      setTemplates(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      addToast('ไม่สามารถโหลดรายการ Template ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPermitTypes = async () => {
    try {
      const result = await documentReviewAPI.getTemplatePermitTypes();
      setPermitTypes(Array.isArray(result) ? result : []);
    } catch (e) { console.error(e); }
  };

  const loadAgencies = async () => {
    try {
      const result = await documentReviewAPI.getTemplateAgencies();
      setAgencies(Array.isArray(result) ? result : []);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`ต้องการลบ Template "${name}" ใช่หรือไม่?`)) return;
    try {
      await documentReviewAPI.deleteTemplateChecklist(id);
      addToast('ลบ Template สำเร็จ', 'success');
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      addToast('ไม่สามารถลบ Template ได้', 'error');
    }
  };

  const handleCopy = async (id, name) => {
    try {
      await documentReviewAPI.copyTemplateChecklist(id, { name: `${name} (สำเนา)` });
      addToast('คัดลอก Template สำเร็จ', 'success');
      loadTemplates();
    } catch (error) {
      console.error('Failed to copy template:', error);
      addToast('ไม่สามารถคัดลอก Template ได้', 'error');
    }
  };

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
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Template Checklist</h1>
            <p className="mt-2 text-base text-slate-500">จัดการ Template รายการเอกสารสำหรับยื่นขออนุญาต</p>
          </div>
          <button
            onClick={() => { setEditingTemplate(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + สร้าง Template ใหม่
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="ค้นหา Template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
          <select
            value={filterPermitType}
            onChange={(e) => setFilterPermitType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            <option value="">ทุกประเภทใบอนุญาต</option>
            {permitTypes.map(pt => (
              <option key={pt.permit_type} value={pt.permit_type}>{pt.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Template List */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">ชื่อ Template</th>
                <th className="px-6 py-4 text-left font-semibold">ประเภทใบอนุญาต</th>
                <th className="px-6 py-4 text-left font-semibold">หน่วยงาน</th>
                <th className="px-6 py-4 text-left font-semibold">จำนวนรายการ</th>
                <th className="px-6 py-4 text-left font-semibold">แหล่งอ้างอิง</th>
                <th className="px-6 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">ยังไม่มี Template</td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{template.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {permitTypes.find(pt => pt.permit_type === template.permit_type)?.name || template.permit_type}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{template.agency || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{template.item_count || 0} รายการ</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{template.source || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const detail = await documentReviewAPI.getTemplateChecklist(template.id);
                            setDetailTemplate(detail);
                            setShowDetail(true);
                          }}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          ดูรายละเอียด
                        </button>
                        <button
                          onClick={async () => {
                            const detail = await documentReviewAPI.getTemplateChecklist(template.id);
                            setEditingTemplate(detail);
                            setShowForm(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleCopy(template.id, template.name)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          คัดลอก
                        </button>
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detail */}
      {showDetail && (
        <TemplateDetailModal
          template={detailTemplate}
          onClose={() => { setShowDetail(false); setDetailTemplate(null); }}
        />
      )}

      {/* Modal Form */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          agencies={agencies}
          permitTypes={permitTypes}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
          onSaved={() => { setShowForm(false); setEditingTemplate(null); loadTemplates(); loadPermitTypes(); loadAgencies(); }}
        />
      )}
    </div>
  );
}

function TemplateForm({ template, agencies, permitTypes, onClose, onSaved }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newAgency, setNewAgency] = useState('');
  const [showNewAgency, setShowNewAgency] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    permit_type: template?.permit_type || 'controlled_energy',
    document_type: template?.document_type || '',
    agency: template?.agency || '',
    source: template?.source || '',
  });
  const [items, setItems] = useState(
    template?.items?.map(item => ({
      title: item.title || '',
      description: item.description || '',
      is_required: item.is_required === 1 || item.is_required === true,
    })) || [
      { title: '', description: '', is_required: true },
    ]
  );

  const handleAddItem = () => {
    setItems([...items, { title: '', description: '', is_required: true }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      addToast('กรุณาระบุชื่อ Template', 'error');
      return;
    }

    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) {
      addToast('กรุณาระบุรายการเอกสารอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...formData,
        items: validItems.map(item => ({
          ...item,
          is_required: item.is_required ? 1 : 0,
        })),
      };

      if (template) {
        await documentReviewAPI.updateTemplateChecklist(template.id, data);
        addToast('แก้ไข Template สำเร็จ', 'success');
      } else {
        await documentReviewAPI.createTemplateChecklist(data);
        addToast('สร้าง Template สำเร็จ', 'success');
      }
      onSaved();
    } catch (error) {
      console.error('Failed to save template:', error);
      addToast('ไม่สามารถบันทึก Template ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {template ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Template Info */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ Template *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น เช็คลิส์ พค.2 ขอใบอนุญาตผลิตพลังงานควบคุม"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทใบอนุญาต</label>
                <select
                  value={formData.permit_type}
                  onChange={(e) => setFormData({ ...formData, permit_type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                >
                  {permitTypes.map(pt => (
                    <option key={pt.permit_type} value={pt.permit_type}>{pt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงาน</label>
                {showNewAgency ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAgency}
                      onChange={(e) => setNewAgency(e.target.value)}
                      placeholder="พิมพ์ชื่อหน่วยงานใหม่"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                    <button type="button" onClick={() => {
                      if (newAgency.trim()) {
                        setFormData({ ...formData, agency: newAgency.trim() });
                        setShowNewAgency(false);
                        setNewAgency('');
                      }
                    }} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">เพิ่ม</button>
                    <button type="button" onClick={() => setShowNewAgency(false)} className="px-3 py-1 text-xs bg-slate-200 text-slate-600 rounded-lg">ยกเลิก</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    >
                      <option value="">-- เลือกหน่วยงาน --</option>
                      {agencies.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowNewAgency(true)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg whitespace-nowrap">+ ใหม่</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">แหล่งอ้างอิง</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="เช่น พระราชบัญญัติการประกอบกิจการพลังงาน พ.ศ. 2550"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">รายการเอกสาร</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 mt-2">{index + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                          placeholder="ชื่อรายการเอกสาร *"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="รายละเอียด (ไม่บังคับ)"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_required}
                            onChange={(e) => handleItemChange(index, 'is_required', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-600">จำเป็น</span>
                        </label>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-3 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                + เพิ่มรายการใหม่
              </button>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึก...' : (template ? 'บันทึกการแก้ไข' : 'สร้าง Template')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TemplateDetailModal - แสดงรายละเอียดรายการใน Template
// ============================================================
function TemplateDetailModal({ template, onClose }) {
  if (!template) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{template.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{template.agency || ''} | {template.items?.length || 0} รายการ</p>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {template.items && template.items.length > 0 ? (
            <div className="space-y-2">
              {template.items.map((item, index) => (
                <div key={item.id || index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.is_required ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.is_required ? 'จำเป็น' : 'ไม่บังคับ'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">ไม่มีรายการเอกสาร</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
