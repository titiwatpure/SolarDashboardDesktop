import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { STATUS_LABELS, STATUS_COLORS, STEP_LABELS, PROVINCES } from '../utils/constants';

export default function ProjectsTable({ filters }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadProjects();
  }, [filters, page]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...filters,
      };
      const data = await projectsAPI.getAll(params);
      setProjects(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือว่าต้องการลบโครงการนี้?')) {
      try {
        await projectsAPI.delete(id);
        loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ชื่อโครงการ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ขนาด (kW)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">จังหวัด</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">สถานะ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ขั้นตอน</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ผู้รับผิดชอบ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{project.project_name}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{project.size_kw}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{project.province}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {STEP_LABELS[project.current_step]}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">-</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded" title="ดู">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="แก้ไข">
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="ลบ"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ก่อนหน้า
        </button>
        <span className="text-sm text-gray-700">
          หน้า {page} จาก {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}
