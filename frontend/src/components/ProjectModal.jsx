import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { projectsAPI, usersAPI, customersAPI } from '../utils/api';
import { PROVINCES, STEP_LABELS, STEP_ORDER } from '../utils/constants';

const emptyForm = {
  project_name: '',
  size_kw: '',
  size_kva: '',
  province: '',
  responsible_user: '',
  description: '',
  has_power_selling: false,
  scope_start: 'survey',
  scope_end: 'cod',
  customer_id: '',
  site_address: '',
  site_lat: '',
  site_lng: '',
  grid_station: '',
  grid_voltage: '',
  contract_number: '',
  contract_value: '',
  contract_date: '',
  budget: '',
  start_date: '',
  expected_cod_date: '',
  actual_cod_date: '',
};

export default function ProjectModal({ isOpen, onClose, onProjectCreated, project }) {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ customer_name: '', customer_type: '', contact_name: '', contact_phone: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    usersAPI.getAll({ limit: 100 })
      .then((res) => setUsers(res.data || []))
      .catch(() => {});
    customersAPI.getAll({ limit: 200 })
      .then((res) => setCustomers(res || []))
      .catch(() => {});
    setShowCustomerForm(false);

    setFormData(
      project
        ? { ...emptyForm, ...project, has_power_selling: Boolean(project.has_power_selling) }
        : emptyForm
    );
    setError('');
  }, [project, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.customer_name) return;
    setCreatingCustomer(true);
    try {
      const created = await customersAPI.create(newCustomer);
      setCustomers((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, customer_id: created.id }));
      setShowCustomerForm(false);
      setNewCustomer({ customer_name: '', customer_type: '', contact_name: '', contact_phone: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'สร้างลูกค้าไม่สำเร็จ');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (project) {
        await projectsAPI.update(project.id, formData);
      } else {
        await projectsAPI.create(formData);
      }
      onProjectCreated?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-card-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {project ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อโครงการ *</label>
              <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">รหัสโครงการ</label>
              {project ? (
                <input type="text" value={project.project_code} disabled
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 text-gray-500" />
              ) : (
                <p className="px-4 py-2 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  สร้างอัตโนมัติเมื่อบันทึก
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ขนาด (kW) *</label>
              <input type="number" step="0.01" name="size_kw" value={formData.size_kw} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ขนาด (kVA)</label>
              <input type="number" step="0.01" name="size_kva" value={formData.size_kva} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">จังหวัด *</label>
              <select name="province" value={formData.province} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="">เลือกจังหวัด</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ผู้รับผิดชอบ</label>
              <select name="responsible_user" value={formData.responsible_user || ''} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="">ไม่ระบุ</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ขอบเขตงาน: เริ่มต้น</label>
              <select name="scope_start" value={formData.scope_start} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                {STEP_ORDER.map((s) => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ขอบเขตงาน: สิ้นสุด</label>
              <select name="scope_end" value={formData.scope_end} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                {STEP_ORDER.filter((s) => STEP_ORDER.indexOf(s) >= STEP_ORDER.indexOf(formData.scope_start))
                  .map((s) => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="has_power_selling" checked={formData.has_power_selling}
                onChange={handleChange} className="w-4 h-4 text-primary-600 rounded" />
              <span className="text-sm font-medium text-gray-700">มีการขายไฟ</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียด</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>

          {/* วันที่สำคัญ */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">วันที่สำคัญ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">วันที่เริ่ม</label>
                <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">วันที่คาดว่าจะ COD</label>
                <input type="date" name="expected_cod_date" value={formData.expected_cod_date || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">วันที่ COD จริง</label>
                <input type="date" name="actual_cod_date" value={formData.actual_cod_date || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* ข้อมูลลูกค้า */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลลูกค้า</h3>
            <div className="flex gap-2">
              <select name="customer_id" value={formData.customer_id || ''} onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
                <option value="">ไม่ระบุลูกค้า</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
              <button type="button" onClick={() => setShowCustomerForm(!showCustomerForm)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                {showCustomerForm ? 'ยกเลิก' : '+ สร้างใหม่'}
              </button>
            </div>
            {showCustomerForm && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <input type="text" placeholder="ชื่อลูกค้า *" value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, customer_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newCustomer.customer_type}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, customer_type: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">ประเภท</option>
                    <option value="individual">บุคคลธรรมดา</option>
                    <option value="company">นิติบุคคล</option>
                    <option value="government">หน่วยงานราชการ</option>
                  </select>
                  <input type="text" placeholder="ผู้ติดต่อ" value={newCustomer.contact_name}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, contact_name: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input type="text" placeholder="เบอร์โทร" value={newCustomer.contact_phone}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, contact_phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={handleCreateCustomer} disabled={creatingCustomer || !newCustomer.customer_name}
                  className="px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                  {creatingCustomer ? 'กำลังสร้าง...' : 'สร้างลูกค้า'}
                </button>
              </div>
            )}
          </div>

          {/* สถานที่ติดตั้ง */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">สถานที่ติดตั้ง</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ที่อยู่สถานที่</label>
                <input type="text" name="site_address" value={formData.site_address || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ละติจูด</label>
                  <input type="number" step="any" name="site_lat" value={formData.site_lat || ''} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ลองจิจูด</label>
                  <input type="number" step="any" name="site_lng" value={formData.site_lng || ''} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">สถานีไฟฟ้า</label>
                  <input type="text" name="grid_station" value={formData.grid_station || ''} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">แรงดันไฟฟ้า</label>
                  <input type="text" name="grid_voltage" value={formData.grid_voltage || ''} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* สัญญา/การเงิน */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">สัญญา / การเงิน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">เลขที่สัญญา</label>
                <input type="text" name="contract_number" value={formData.contract_number || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">วันที่เซ็นสัญญา</label>
                <input type="date" name="contract_date" value={formData.contract_date || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">มูลค่าสัญญา (บาท)</label>
                <input type="number" step="0.01" name="contract_value" value={formData.contract_value || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">งบประมาณ (บาท)</label>
                <input type="number" step="0.01" name="budget" value={formData.budget || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
