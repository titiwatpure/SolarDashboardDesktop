import { FileCog, FileText, FileUp, FolderOpen, Link2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { documentsAPI, projectsAPI } from '../utils/api';
import { DOCUMENT_TYPES } from '../utils/constants';

const documentTypeColors = {
  sld: 'bg-blue-50 text-blue-700',
  permit: 'bg-amber-50 text-amber-700',
  test_report: 'bg-emerald-50 text-emerald-700',
  other: 'bg-slate-100 text-slate-700'
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('th-TH');
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    document_name: '',
    document_type: 'other',
    file_path: '',
    file_size: '',
    description: ''
  });

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async (page = 1) => {
    try {
      setLoading(true);
      const [documentResult, projectResponse] = await Promise.all([
        documentsAPI.getAll({ page, limit: 20 }),
        projectsAPI.getAll({ page: 1, limit: 1000 })
      ]);

      const docList = Array.isArray(documentResult) ? documentResult : (documentResult.data || []);
      setDocuments(docList);
      setPagination(Array.isArray(documentResult) ? null : documentResult.pagination);
      setProjects(Array.isArray(projectResponse) ? projectResponse : (projectResponse.data || []));
    } catch (error) {
      console.error('Failed to load documents page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      await documentsAPI.upload({
        ...formData,
        file_size: formData.file_size ? Number(formData.file_size) : null
      });
      setFormData({
        project_id: '',
        document_name: '',
        document_type: 'other',
        file_path: '',
        file_size: '',
        description: ''
      });
      loadPageData();
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('บันทึกเอกสารไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบเอกสารนี้หรือไม่?')) {
      return;
    }

    try {
      await documentsAPI.delete(id);
      loadPageData();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const summaryByType = Object.keys(DOCUMENT_TYPES).reduce((acc, key) => {
    acc[key] = documents.filter((document) => document.document_type === key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FolderOpen size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">เอกสารโครงการ</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                รวมเอกสารประกอบโครงการทั้งหมดในระบบ พร้อมจัดการประเภทเอกสารและเชื่อมโยงกับโครงการได้จากหน้าเดียว
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">เพิ่มเอกสารใหม่</h2>
              <p className="text-sm text-slate-500">แนบข้อมูลเอกสารและเชื่อมโยงเข้ากับโครงการที่เกี่ยวข้อง</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              required
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">เลือกโครงการ</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="document_name"
              value={formData.document_name}
              onChange={handleChange}
              placeholder="ชื่อเอกสาร"
              required
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            />

            <select
              name="document_type"
              value={formData.document_type}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <div className="relative">
              <Link2 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="file_path"
                value={formData.file_path}
                onChange={handleChange}
                placeholder="file path หรือ URL"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>

            <input
              type="number"
              name="file_size"
              value={formData.file_size}
              onChange={handleChange}
              placeholder="ขนาดไฟล์ (bytes)"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            />

            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="คำอธิบายเพิ่มเติม"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <FileUp size={18} />
            {saving ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
          </button>
        </form>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FileCog size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">สรุปตามประเภทเอกสาร</h2>
              <p className="text-sm text-slate-500">นับจำนวนเอกสารในแต่ละหมวดเพื่อดูภาพรวมอย่างรวดเร็ว</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
              <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{label}</p>
                      <p className="text-sm text-slate-500">จำนวนไฟล์ในระบบ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{summaryByType[key] || 0}</p>
                    <p className="text-xs text-slate-500">ไฟล์</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">รายการเอกสาร</h2>
          <p className="mt-1 text-sm text-slate-500">เอกสารที่ถูกเพิ่มเข้าสู่ระบบล่าสุด พร้อมรายละเอียดโครงการที่เกี่ยวข้อง</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">ชื่อเอกสาร</th>
                <th className="px-5 py-4 text-left font-semibold">ประเภท</th>
                <th className="px-5 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-5 py-4 text-left font-semibold">วันที่อัปโหลด</th>
                <th className="px-5 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    ยังไม่มีเอกสารในระบบ
                  </td>
                </tr>
              )}

              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-medium text-slate-900">{document.document_name}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${documentTypeColors[document.document_type] || documentTypeColors.other}`}
                    >
                      {DOCUMENT_TYPES[document.document_type] || document.document_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{document.project_name || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{formatDate(document.uploaded_at)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(document.id)}
                      className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              แสดง {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} จาก {pagination.total} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadPageData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <span className="text-sm text-slate-500">หน้า {pagination.page} / {pagination.pages}</span>
              <button
                onClick={() => loadPageData(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
