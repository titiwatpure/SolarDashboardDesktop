import { CheckSquare, ChevronDown, Plus, Search, Trash2, Edit2, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI, usersAPI } from '../utils/api';
import { PRIORITY_LABELS, STATUS_LABELS } from '../utils/constants';

const TASK_STATUSES = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
};

const formatDate = (v) => v ? new Date(v).toLocaleDateString('th-TH') : '-';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({ status: '', priority: '', project_id: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', priority: 'medium', assigned_to: '', due_date: '',
  });

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [filters, page]);

  const loadDropdowns = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        projectsAPI.getAll({ limit: 1000 }),
        usersAPI.getAll(),
      ]);
      setProjects(Array.isArray(projRes) ? projRes : (projRes.data || []));
      setUsers(Array.isArray(userRes) ? userRes : (userRes.data || []));
    } catch (e) {
      console.error(e);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project_id) params.project_id = filters.project_id;

      const data = await tasksAPI.getAll(params);
      setTasks(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm({ project_id: '', title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      project_id: task.project_id || '',
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, form);
      } else {
        await tasksAPI.create(form);
      }
      setShowModal(false);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบงานนี้?')) return;
    try {
      await tasksAPI.delete(id);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await tasksAPI.update(task.id, { status: newStatus });
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const isOverdue = (task) => task.due_date && new Date(task.due_date) < new Date() && !['completed', 'cancelled'].includes(task.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <CheckSquare size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">งานที่มอบหมาย</h1>
              <p className="mt-2 text-base text-slate-500">จัดการงานที่มอบหมายในแต่ละโครงการ</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            สร้างงานใหม่
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">กรองข้อมูล</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="relative">
            <select
              value={filters.project_id}
              onChange={(e) => handleFilterChange('project_id', e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">ทุกโครงการ</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <label className="relative">
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">ทุกระดับความสำคัญ</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <label className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">ทุกสถานะ</option>
              {Object.entries(TASK_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
        </div>
      </section>

      {/* Task list */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ชื่องาน</th>
                <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                <th className="px-4 py-3 text-left font-semibold">ความสำคัญ</th>
                <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3 text-left font-semibold">ครบกำหนด</th>
                <th className="px-4 py-3 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">ไม่มีงานที่มอบหมาย</td>
                </tr>
              )}
              {tasks.map((task) => (
                <tr key={task.id} className={`hover:bg-slate-50/70 ${isOverdue(task) ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[250px]">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{task.project_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer border-0 outline-none ${STATUS_COLORS[task.status]}`}
                    >
                      {Object.entries(TASK_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{task.assigned_to_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={isOverdue(task) ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                      {formatDate(task.due_date)}
                      {isOverdue(task) && ' ⚠'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50"
                        title="แก้ไข"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                        title="ลบ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 border-t border-slate-200 mt-4 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>แสดง {tasks.length === 0 ? 0 : (page - 1) * 15 + 1} - {(page - 1) * 15 + tasks.length} จาก {totalItems} รายการ</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
            <span className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">{page}</span>
            <span>จาก {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
          </div>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-5">{editingTask ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">โครงการ *</label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">เลือกโครงการ</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่องาน *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  placeholder="ชื่องาน"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  rows={3}
                  placeholder="รายละเอียดงาน"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ความสำคัญ</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ครบกำหนด</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ผู้รับผิดชอบ</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">ไม่ระบุ</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={!form.project_id || !form.title}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTask ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
