import { FileText, FileUp, FolderOpen, Trash2, Download, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    project_id: '',
    document_name: '',
    document_type: 'other',
    description: ''
  });
  const [filterProject, setFilterProject] = useState('');
  const [projectSummary, setProjectSummary] = useState([]);

  useEffect(() => {
    loadPageData();
    documentsAPI.getSummary().then(res => setProjectSummary(Array.isArray(res) ? res : (res.data || []))).catch(() => {});
  }, []);

  useEffect(() => {
    loadPageData(1);
  }, [filterProject]);

  const loadPageData = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filterProject) params.project_id = filterProject;
      const [documentResult, projectResponse] = await Promise.all([
        documentsAPI.getAll(params),
        projectsAPI.getAll({ page: 1, limit: 5000 })
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

      if (selectedFile) {
        // ส่ง field ปกติก่อน แล้วค่อยส่ง file (multer parse ตามลำดับ)
        const formDataObj = new FormData();
        formDataObj.append('project_id', formData.project_id);
        formDataObj.append('document_name', formData.document_name || selectedFile.name);
        formDataObj.append('document_type', formData.document_type);
        formDataObj.append('description', formData.description);
        formDataObj.append('file', selectedFile);

        await documentsAPI.upload(formDataObj, (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        });
      } else {
        // ส่งแค่ metadata (ไม่มีไฟล์)
        await documentsAPI.upload(formData);
      }

      setFormData({
        project_id: '',
        document_name: '',
        document_type: 'other',
        description: ''
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadPageData();
      documentsAPI.getSummary().then(res => setProjectSummary(Array.isArray(res) ? res : (res.data || []))).catch(() => {});
    } catch (error) {
      console.error('Failed to create document:', error);
      alert(error.response?.data?.error || 'บันทึกเอกสารไม่สำเร็จ');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    // ตั้งชื่อเอกสารอัตโนมัติจากชื่อไฟล์
    if (!formData.document_name) {
      setFormData((prev) => ({ ...prev, document_name: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบเอกสารนี้หรือไม่?')) {
      return;
    }

    try {
      await documentsAPI.delete(id);
      loadPageData();
      documentsAPI.getSummary().then(res => setProjectSummary(Array.isArray(res) ? res : (res.data || []))).catch(() => {});
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

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

            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="คำอธิบายเพิ่มเติม"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </div>

          {/* File Upload Area */}
          <div
            className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'
            } ${selectedFile ? 'border-green-300 bg-green-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-green-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="ml-2 rounded-full p-1 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  ลากไฟล์มาวางที่นี่ หรือ{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 underline hover:text-blue-700"
                  >
                    เลือกไฟล์
                  </button>
                </p>
                <p className="mt-1 text-xs text-slate-400">รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP (สูงสุด 50MB)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>

          {saving && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>กำลังอัปโหลด...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

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
              <FolderOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">เอกสารตามโครงการ</h2>
              <p className="text-sm text-slate-500">คลิกเพื่อกรองเอกสารของโครงการนั้น</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1 max-h-[420px] overflow-y-auto pr-1">
            {projectSummary.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีเอกสาร</p>
            )}
            {projectSummary.map((item) => (
              <button
                key={item.project_id}
                onClick={() => setFilterProject(filterProject === item.project_id ? '' : item.project_id)}
                className={`w-full text-left rounded-2xl border p-4 transition ${
                  filterProject === item.project_id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{item.project_name || 'ไม่ระบุโครงการ'}</p>
                    <p className="text-xs text-slate-500">{item.project_code}</p>
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                    <p className="text-xs text-slate-500">ไฟล์</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">รายการเอกสาร</h2>
            <p className="mt-1 text-sm text-slate-500">เอกสารที่ถูกเพิ่มเข้าสู่ระบบล่าสุด พร้อมรายละเอียดโครงการที่เกี่ยวข้อง</p>
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="">ทุกโครงการ</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
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
                    <div className="flex items-center gap-1">
                      {document.file_path && (
                        <button
                          onClick={async () => {
                            try {
                              await documentsAPI.download(document.id, document.document_name);
                            } catch (err) {
                              alert('ดาวน์โหลดไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
                            }
                          }}
                          className="rounded-full p-2 text-blue-500 transition-colors hover:bg-blue-50"
                          title="ดาวน์โหลด"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(document.id)}
                        className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
