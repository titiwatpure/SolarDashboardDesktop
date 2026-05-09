import { Edit2, Plus, ShieldCheck, Trash2, User, Users2, X, Loader } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usersAPI } from '../utils/api';

const emptyForm = { username: '', email: '', password: '', full_name: '', role: 'engineer' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      const result = await usersAPI.getAll({ page, limit: 20 });
      const userList = Array.isArray(result) ? result : (result.data || []);
      setUsers(userList);
      setPagination(Array.isArray(result) ? null : result.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือว่าต้องการลบผู้ใช้นี้?')) return;
    try {
      await usersAPI.delete(id);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role || 'engineer',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingUser) {
        await usersAPI.update(editingUser.id, {
          full_name: formData.full_name,
          email: formData.email,
        });
      } else {
        await usersAPI.create(formData);
      }
      await loadUsers();
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const total = pagination?.total || users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const engineers = users.filter((u) => u.role !== 'admin').length;
    const active = users.filter((u) => u.status === 'active').length;
    return { total, admins, engineers, active };
  }, [users, pagination]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <Users2 size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">ผู้ใช้งานระบบ</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                จัดการรายชื่อผู้ใช้งาน สิทธิ์การเข้าถึง และสถานะการใช้งานของทีมในระบบแดชบอร์ด
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            เพิ่มผู้ใช้งาน
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">ผู้ใช้ทั้งหมด</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users2 size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Administrator</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.admins}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Engineer</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.engineers}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <User size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">ใช้งานอยู่</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.active}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">รายชื่อผู้ใช้งาน</h2>
          <p className="mt-1 text-sm text-slate-500">ภาพรวมรายชื่อผู้ใช้ทั้งหมด พร้อมบทบาทและสถานะการใช้งาน</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">ผู้ใช้</th>
                <th className="px-5 py-4 text-left font-semibold">ชื่อเต็ม</th>
                <th className="px-5 py-4 text-left font-semibold">อีเมล</th>
                <th className="px-5 py-4 text-left font-semibold">บทบาท</th>
                <th className="px-5 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-5 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    ยังไม่มีผู้ใช้งานในระบบ
                  </td>
                </tr>
              )}

              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                        {(user.full_name || user.username || 'U').charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{user.full_name || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? 'Administrator' : 'Engineer'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.status === 'active' ? 'ใช้งานอยู่' : 'ไม่ใช้งาน'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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
                onClick={() => loadUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <span className="text-sm text-slate-500">หน้า {pagination.page} / {pagination.pages}</span>
              <button
                onClick={() => loadUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal เพิ่ม/แก้ไขผู้ใช้ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อผู้ใช้ {!editingUser && '*'}</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  required={!editingUser}
                  disabled={Boolean(editingUser)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                {editingUser && (
                  <p className="mt-1 text-xs text-slate-400">ไม่สามารถเปลี่ยนชื่อผู้ใช้ได้</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">อีเมล *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่าน *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อเต็ม</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="engineer">Engineer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท</label>
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    editingUser.role === 'admin' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {editingUser.role === 'admin' ? 'Administrator' : 'Engineer'}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">ไม่สามารถเปลี่ยนบทบาทได้</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingUser(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving
                    ? <><Loader size={14} className="animate-spin" /> กำลังบันทึก...</>
                    : (editingUser ? 'บันทึก' : 'สร้างผู้ใช้')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
