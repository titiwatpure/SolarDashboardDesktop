import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { PROVINCES } from '../utils/constants';

// ค่าเริ่มต้นของ form เมื่อสร้างโครงการใหม่
// หากต้องการเพิ่มเขตใหม่ในฟอร์ม เพิ่มตรงนี้และในส่วน input ด้านล่าง
const emptyForm = {
  project_name: '',      // ชื่อโครงการ
  project_code: '',      // รหัสโครงการ
  size_kw: '',           // ขนาด kW
  size_kva: '',          // ขนาด kVA
  province: '',          // จังหวัด
  description: '',       // รายละเอียด
  has_power_selling: false // มีการขายไฟหรือไม่
};

// รับ props:
// - isOpen: แสดง/ซ่อน modal
// - onClose: ปิด modal
// - onProjectCreated: callback เมื่อบันทึกสำเร็จ เพื่อโหลดตารางใหม่
// - project: object สำหรับแก้ไข (ถ้า null = สร้างใหม่)
export default function ProjectModal({ isOpen, onClose, onProjectCreated, project }) {
  const [formData, setFormData] = useState(project || emptyForm); // เก็บข้อมูลฟอร์ม
  const [loading, setLoading] = useState(false);                  // สถานะกำลังบันทึก

  // เมื่อเปิด modal ใหม่ ให้โหลดข้อมูลโครงการเข้า form (ถ้าแก้ไข) หรือ reset form (ถ้าสร้างใหม่)
  useEffect(() => {
    if (project) {
      setFormData({
        ...emptyForm,
        ...project,
        has_power_selling: Boolean(project.has_power_selling) // แปลง 0/1 เป็น true/false
      });
      return;
    }

    setFormData(emptyForm); // reset form ถ้าไม่มี project
  }, [project, isOpen]);

  // อัปเดต formData เมื่อผู้ใช้พิมพ์ข้อมูลใน input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value, // checkbox ใช้ checked, input อื่นๆ ใช้ value
    }));
  };

  // ส่งข้อมูลไปยัง API
  const handleSubmit = async (e) => {
    e.preventDefault(); // ป้องกัน page reload
    try {
      setLoading(true);
      if (project) {
        await projectsAPI.update(project.id, formData); // แก้ไขโครงการที่มีอยู่
      } else {
        await projectsAPI.create(formData);             // สร้างโครงการใหม่
      }
      onProjectCreated?.(); // เรียก callback เพื่อโหลดตารางใหม่
      onClose();            // ปิด modal
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false); // รีเซ็ตสถานะโหลด
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อโครงการ *
              </label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสโครงการ *
              </label>
              <input
                type="text"
                name="project_code"
                value={formData.project_code}
                onChange={handleChange}
                required
                disabled={Boolean(project)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ขนาด (kW) *
              </label>
              <input
                type="number"
                step="0.01"
                name="size_kw"
                value={formData.size_kw}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ขนาด (kVA)
              </label>
              <input
                type="number"
                step="0.01"
                name="size_kva"
                value={formData.size_kva}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จังหวัด *
              </label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">เลือกจังหวัด</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 mt-8">
                <input
                  type="checkbox"
                  name="has_power_selling"
                  checked={formData.has_power_selling}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">มีการขายไฟ</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รายละเอียด
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
