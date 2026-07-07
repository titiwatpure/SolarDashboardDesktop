/**
 * DocReviewNew - ฟอร์มสร้างโครงการยื่นเอกสารใหม่
 * ดึงข้อมูลอ้างอิงจากโครงการหลักที่มีอยู่แล้ว
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI, projectsAPI, usersAPI, customersAPI } from '../utils/api';

const AGENCIES = [
  { value: 'กกพ.', label: 'กกพ. (คณะกรรมการกำกับกิจการพลังงาน)' },
  { value: 'พพ.', label: 'พพ. (กรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน)' },
  { value: 'PEA', label: 'PEA (การไฟฟ้าส่วนภูมิภาค)' },
  { value: 'MEA', label: 'MEA (การไฟฟ้านครหลวง)' },
  { value: 'เทศบาล', label: 'เทศบาล / อบต.' },
  { value: 'กรมโรงงาน', label: 'กรมโรงงานอุตสาหกรรม' },
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

export default function DocReviewNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_line: '',
    permit_type: 'pck2',
    agency: '',
    due_date: '',
    owner_user_id: currentUser.id || '',
    notes: '',
  });

  // ดึงรายการโครงการที่มีอยู่แล้ว + templates + users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProjects(true);
        const [projResult, tplResult, usersResult, customersResult] = await Promise.all([
          projectsAPI.getAll({}),
          documentReviewAPI.getTemplateChecklists(),
          usersAPI.getAll(),
          customersAPI.getAll()
        ]);
        setExistingProjects(Array.isArray(projResult) ? projResult : (projResult.data || []));
        setTemplates(Array.isArray(tplResult) ? tplResult : []);
        setUsers(Array.isArray(usersResult) ? usersResult : (usersResult.data || []));
        setCustomers(Array.isArray(customersResult) ? customersResult : (customersResult.data || []));
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // เมื่อเลือกโครงการเดิม ให้ดึงข้อมูลมากรอกอัตโนมัติ
  const handleProjectSelect = async (e) => {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    
    if (!projectId) {
      // รีเซ็ตฟอร์ม
      setFormData({
        project_code: '',
        project_name: '',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_line: '',
        permit_type: 'pck2',
        agency: '',
        due_date: '',
        owner_user_id: currentUser.id || '',
        notes: '',
      });
      return;
    }

    try {
      const project = await projectsAPI.getById(projectId);
      if (project) {
        setFormData(prev => ({
          ...prev,
          project_code: project.project_code || '',
          project_name: project.project_name || '',
          customer_name: project.customer_name || '',
          customer_phone: project.customer_phone || '',
          customer_email: project.customer_email || '',
          customer_line: project.customer_line || '',
          notes: project.notes || '',
        }));
      }
    } catch (err) {
      console.error('Failed to fetch project details:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project_code || !formData.project_name || !formData.permit_type) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสโครงการ, ชื่อโครงการ, ประเภทใบอนุญาต)');
      return;
    }

    try {
      setLoading(true);
      const result = await documentReviewAPI.createReviewProject(formData);
      navigate(`/doc-review/${result.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างโครงการ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/doc-review')}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1"
        >
          ← กลับไปแดชบอร์ด
        </button>
        <h1 className="text-3xl font-bold text-slate-900">สร้างโครงการยื่นเอกสารใหม่</h1>
        <p className="text-slate-500 mt-2">กรอกข้อมูลโครงการเพื่อเริ่มกระบวนการตรวจเอกสารและยื่นหน่วยงาน</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ข้อมูลโครงการ */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลโครงการ</h2>
          
          {/* เลือกโครงการเดิม */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <label className="block text-sm font-medium text-blue-800 mb-2">🔗 เชื่อมโยงกับโครงการเดิม (เลือกเพื่อดึงข้อมูลอัตโนมัติ)</label>
            <select
              value={selectedProjectId}
              onChange={handleProjectSelect}
              disabled={loadingProjects}
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
            >
              <option value="">
                {loadingProjects ? 'กำลังโหลดรายการโครงการ...' : '-- เลือกโครงการเดิม (ถ้ามี) --'}
              </option>
              {existingProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-600 mt-2">💡 เลือกโครงการเดิมจะดึงข้อมูลลูกค้าและชื่อโครงการมากรอกอัตโนมัติ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">รหัสโครงการ *</label>
              <input
                type="text"
                name="project_code"
                value={formData.project_code}
                onChange={handleChange}
                placeholder="เช่น PRJ-2024-001"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโครงการ *</label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                placeholder="เช่น โรงไฟฟ้าแสงอาทิตย์ จ.ชลบุรี"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทใบอนุญาต *</label>
              <select
                name="permit_type"
                value={formData.permit_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                required
              >
                {templates.map(t => (
                  <option key={t.id} value={t.permit_type}>{t.name} ({t.item_count} รายการ)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงานที่ยื่น</label>
              <select
                name="agency"
                value={formData.agency}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">-- เลือกหน่วยงาน --</option>
                {AGENCIES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">กำหนดส่งเอกสาร</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ผู้รับผิดชอบโครงการ</label>
              <select
                name="owner_user_id"
                value={formData.owner_user_id}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">-- ยังไม่ระบุ --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ข้อมูลลูกค้า */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลลูกค้า</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เลือกลูกค้า</label>
              <select
                value={formData.customer_id || ''}
                onChange={(e) => {
                  const customerId = e.target.value;
                  if (customerId) {
                    const selected = customers.find(c => c.id === customerId);
                    if (selected) {
                      setFormData(prev => ({
                        ...prev,
                        customer_id: customerId,
                        customer_name: selected.customer_name || '',
                        customer_phone: selected.contact_phone || '',
                        customer_email: selected.contact_email || '',
                      }));
                    }
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      customer_id: '',
                      customer_name: '',
                      customer_phone: '',
                      customer_email: '',
                    }));
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">-- เลือกลูกค้าจากฐานข้อมูล --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า / บริษัท</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="หรือกรอกใหม่ถ้าไม่มีในรายการ"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                placeholder="081-234-5678"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                placeholder="customer@email.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">LINE ID</label>
              <input
                type="text"
                name="customer_line"
                value={formData.customer_line}
                onChange={handleChange}
                placeholder="@customer_line"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* หมายเหตุ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="บันทึกข้อมูลเพิ่มเติมเกี่ยวกับโครงการ..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white resize-none"
          />
        </div>

        {/* ปุ่มบันทึก */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/doc-review')}
            className="px-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังบันทึก...' : 'สร้างโครงการ'}
          </button>
        </div>
      </form>
    </div>
  );
}
