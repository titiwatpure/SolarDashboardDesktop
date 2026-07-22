import { Edit2, Eye, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
import { PERMIT_TYPES, STATUS_COLORS, STATUS_LABELS, STEP_LABELS, RISK_LEVELS } from '../utils/constants';
import StatusModal from './StatusModal';
import RiskBadge from './RiskBadge';

const permitClassNames = {
  exemption: 'bg-emerald-50 text-emerald-700',
  permit: 'bg-rose-50 text-rose-700'
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('th-TH');
};

// รับ props:
// - filters: object ตัวกรองจาก Dashboard (province, status, current_step, search)
// - refreshKey: เพิ่มค่านี้จากภายนอกเพื่อบังคับให้ตารางโหลดใหม่
// - onEditProject: callback เมื่อกดปุ่มแก้ไขโครงการ
// - onStatusUpdated: callback เมื่ออัปเดตสถานะสำเร็จ (ส่งจาก Dashboard)
export default function ProjectsTable({ filters, refreshKey = 0, onEditProject, onStatusUpdated }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);    // รายการโครงการในหน้าปัจจุบัน
  const [loading, setLoading] = useState(true);    // สถานะกำลังโหลด
  const [page, setPage] = useState(1);             // หน้าปัจจุบัน
  const [totalPages, setTotalPages] = useState(1); // จำนวนหน้าทั้งหมด
  const [totalItems, setTotalItems] = useState(0); // จำนวนรายการทั้งหมด

  // State สำหรับ StatusModal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusProject, setStatusProject] = useState(null); // โครงการที่กำลังอัปเดต

  // ฟังก์ชันกลางสำหรับโหลดข้อมูล (ใช้ร่วมกันทุกจุด)
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectsAPI.getAll({ page, limit: 10, ...filters });
      setProjects(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // เมื่อ filter เปลี่ยน ให้กลับไปหน้าแรกเสมอ
  useEffect(() => {
    setPage(1);
  }, [filters, refreshKey]);

  // โหลดข้อมูลโครงการเมื่อ filter หรือ page เปลี่ยน
  useEffect(() => {
    fetchProjects();
  }, [filters, page, refreshKey]);

  // เปิด StatusModal พร้อมส่งข้อมูลโครงการที่เลือก
  const handleOpenStatusModal = (project) => {
    setStatusProject(project);
    setIsStatusModalOpen(true);
  };

  // เมื่ออัปเดตสถานะสำเร็จ ให้ปิด Modal → refreshKey จะ trigger useEffect โหลดใหม่เอง
  const handleStatusUpdated = () => {
    setIsStatusModalOpen(false);
    onStatusUpdated?.();
  };

  // ลบโครงการ - ถามยืนยันก่อนเสมอ
  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือว่าต้องการลบโครงการนี้?')) return;

    try {
      await projectsAPI.delete(id);
      await fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">รหัสโครงการ</th>
              <th className="px-5 py-4 text-left font-semibold">ชื่อโครงการ</th>
              <th className="px-5 py-4 text-left font-semibold">ประเภทโครงการ</th>
              <th className="px-5 py-4 text-left font-semibold">ขนาด (kVA)</th>
              <th className="px-5 py-4 text-left font-semibold">จังหวัด</th>
              <th className="px-5 py-4 text-left font-semibold">ขั้นตอนปัจจุบัน</th>
              <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
              <th className="px-5 py-4 text-left font-semibold">ความคืบหน้า</th>
              <th className="px-5 py-4 text-left font-semibold">ความเสี่ยง</th>
              <th className="px-5 py-4 text-left font-semibold">ลูกค้า</th>
              <th className="px-5 py-4 text-left font-semibold">หน่วยงาน</th>
              <th className="px-5 py-4 text-left font-semibold">ผู้รับผิดชอบ</th>
              <th className="px-5 py-4 text-left font-semibold">อัปเดตล่าสุด</th>
              <th className="px-5 py-4 text-center font-semibold">จัดการ</th>
              {/* เพิ่มคอลัมน์ใหม่ได้ตรงนี้ */}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan="14" className="px-5 py-10 text-center text-slate-500">
                  ยังไม่มีข้อมูลโครงการ
                </td>
              </tr>
            )}

            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-4 font-medium text-slate-700">{project.project_code}</td>
                <td className="px-5 py-4 text-slate-900">{project.project_name}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${permitClassNames[project.permit_type] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {PERMIT_TYPES[project.permit_type] || '-'}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-700">{project.size_kva || '-'}</td>
                <td className="px-5 py-4 text-slate-700">{project.province}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                    {STEP_LABELS[project.current_step] || project.current_step}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          project.progress >= 100 ? 'bg-emerald-500' :
                          project.progress >= 60 ? 'bg-blue-500' :
                          project.progress >= 30 ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-9 text-right">{project.progress || 0}%</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <RiskBadge level={project.risk_level} />
                  {(!project.risk_level || project.risk_level === 'low') && (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-700">{project.customer_name || '-'}</td>
                <td className="px-5 py-4 text-slate-700 max-w-[200px] truncate" title={project.organizations || ''}>
                  {project.organizations || '-'}
                </td>
                <td className="px-5 py-4 text-slate-700">{project.responsible_user_name || '-'}</td>
                <td className="px-5 py-4 text-slate-700">{formatDate(project.updated_at || project.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-1">
                    {/* ดูรายละเอียด */}
                    <button
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      title="ดูรายละเอียด"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <Eye size={16} />
                    </button>
                    {/* แก้ไขข้อมูลโครงการ */}
                    <button
                      className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      title="แก้ไขข้อมูล"
                      onClick={() => onEditProject?.(project)}
                    >
                      <Edit2 size={16} />
                    </button>
                    {/* ดูรายงาน */}
                    <button
                      className="rounded-full p-2 text-violet-600 transition-colors hover:bg-violet-50"
                      title="ดูรายงาน"
                      onClick={() => navigate(`/projects/${project.id}/report`)}
                    >
                      <FileText size={16} />
                    </button>
                    {/* รายงานลูกค้า */}
                    <button
                      className="rounded-full p-2 text-cyan-600 transition-colors hover:bg-cyan-50"
                      title="รายงานลูกค้า"
                      onClick={() => navigate(`/projects/${project.id}/customer-report`)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </button>
                    {/* อัปเดตสถานะ */}
                    <button
                      className="rounded-full p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                      title="อัปเดตสถานะ"
                      onClick={() => handleOpenStatusModal(project)}
                    >
                      <RefreshCw size={16} />
                    </button>
                    {/* ลบโครงการ */}
                    <button
                      className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                      title="ลบ"
                      onClick={() => handleDelete(project.id)}
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

      <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <span>
          แสดง {projects.length === 0 ? 0 : (page - 1) * 10 + 1} - {(page - 1) * 10 + projects.length} จาก {totalItems} รายการ
        </span>

        <div className="flex items-center gap-1">
          {/* ก่อนหน้า */}
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ก่อนหน้า
          </button>

          {/* สร้างปุ่มเลขหน้า */}
          {(() => {
            const pages = [];
            const maxVisible = 5;
            let start = Math.max(1, page - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);
            
            if (end - start + 1 < maxVisible) {
              start = Math.max(1, end - maxVisible + 1);
            }

            // หน้าแรก
            if (start > 1) {
              pages.push(
                <button key={1} onClick={() => setPage(1)}
                  className="min-w-[36px] rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                  1
                </button>
              );
              if (start > 2) {
                pages.push(<span key="dots1" className="px-1 text-slate-400">...</span>);
              }
            }

            // หน้ากลาง
            for (let i = start; i <= end; i++) {
              pages.push(
                <button key={i} onClick={() => setPage(i)}
                  className={`min-w-[36px] rounded-lg px-3 py-1.5 font-medium ${
                    page === i 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  {i}
                </button>
              );
            }

            // หน้าสุดท้าย
            if (end < totalPages) {
              if (end < totalPages - 1) {
                pages.push(<span key="dots2" className="px-1 text-slate-400">...</span>);
              }
              pages.push(
                <button key={totalPages} onClick={() => setPage(totalPages)}
                  className="min-w-[36px] rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                  {totalPages}
                </button>
              );
            }

            return pages;
          })()}

          {/* ถัดไป */}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* StatusModal - แสดงเมื่อกดปุ่มอัปเดตสถานะ */}
      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onUpdated={handleStatusUpdated}
        project={statusProject}
      />
    </div>
  );
}
