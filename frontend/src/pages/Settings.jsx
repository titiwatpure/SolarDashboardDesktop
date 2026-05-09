import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Shield, Globe, User, Lock, Eye, EyeOff, Database, Download, Trash2, RefreshCw, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { backupAPI } from '../utils/api';

export default function Settings() {
  const { user, changePassword } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    projectUpdate: true,
    projectBlocked: true,
    weeklyReport: false
  });

  // Backup state
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [restoringName, setRestoringName] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  const isAdmin = user?.role === 'admin';

  const loadBackups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await backupAPI.getAll();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupMessage({ type: '', text: '' });
    try {
      const result = await backupAPI.create();
      setBackupMessage({ type: 'success', text: result.message || 'สำรองฐานข้อมูลสำเร็จ' });
      loadBackups();
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteBackup = async (name) => {
    try {
      await backupAPI.delete(name);
      setBackupMessage({ type: 'success', text: 'ลบไฟล์ backup สำเร็จ' });
      setConfirmDelete(null);
      loadBackups();
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    }
  };

  const handleRestoreBackup = async (name) => {
    setRestoringName(name);
    setBackupMessage({ type: '', text: '' });
    try {
      const result = await backupAPI.restore(name);
      setBackupMessage({ type: 'success', text: result.message || 'กู้คืนสำเร็จ กรุณา restart server' });
      setConfirmRestore(null);
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setRestoringName(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('กรุณากรอกรหัสผ่านทั้งหมด');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จ');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">ตั้งค่า</h1>
            <p className="mt-2 text-base text-slate-500">จัดการการตั้งค่าทั่วไปของระบบ</p>
          </div>
        </div>
      </section>

      {/* Profile Info */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <User size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">ข้อมูลผู้ใช้</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">ชื่อผู้ใช้</span>
            <span className="text-sm font-medium text-slate-900">{user?.username}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">ชื่อ-นามสกุล</span>
            <span className="text-sm font-medium text-slate-900">{user?.full_name || '-'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">อีเมล</span>
            <span className="text-sm font-medium text-slate-900">{user?.email || '-'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">บทบาท</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
              user?.role === 'engineer' ? 'bg-blue-100 text-blue-800' :
              user?.role === 'staff' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user?.role === 'admin' ? 'ผู้ดูแลระบบ' :
               user?.role === 'engineer' ? 'วิศวกร' :
               user?.role === 'staff' ? 'เจ้าหน้าที่' :
               user?.role === 'client' ? 'ลูกค้า' : user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่านปัจจุบัน</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกรหัสผ่านปัจจุบัน"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่านใหม่</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{passwordSuccess}</div>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Shield size={16} />
            {passwordLoading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>

      {/* Notification Settings */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">การแจ้งเตือน</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">ตั้งค่าประเภทการแจ้งเตือนที่ต้องการรับ (บันทึกอัตโนมัติ)</p>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.projectUpdate}
              onChange={(e) => setNotifications((prev) => ({ ...prev, projectUpdate: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">แจ้งเตือนเมื่อมีการอัปเดตโครงการ</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.projectBlocked}
              onChange={(e) => setNotifications((prev) => ({ ...prev, projectBlocked: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">แจ้งเตือนเมื่อมีโครงการติดปัญหา</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.weeklyReport}
              onChange={(e) => setNotifications((prev) => ({ ...prev, weeklyReport: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">แจ้งเตือนรายงานประจำสัปดาห์</span>
          </label>
        </div>
      </div>

      {/* Database Backup - Admin only */}
      {isAdmin && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Database size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">สำรองฐานข้อมูล</h2>
              <p className="text-xs text-slate-400">จัดการไฟล์ backup ของฐานข้อมูล (Admin only)</p>
            </div>
          </div>

          {backupMessage.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              backupMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {backupMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {backupMessage.text}
            </div>
          )}

          <button
            onClick={handleCreateBackup}
            disabled={backupLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-5"
          >
            <HardDrive size={16} />
            {backupLoading ? 'กำลังสำรอง...' : 'สำรองฐานข้อมูลตอนนี้'}
          </button>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ชื่อไฟล์</th>
                  <th className="px-4 py-3 text-left font-semibold">ขนาด</th>
                  <th className="px-4 py-3 text-left font-semibold">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      ยังไม่มีไฟล์ backup
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.name} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatFileSize(b.size)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(b.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={backupAPI.download(b.name)}
                            onClick={(e) => {
                              const token = localStorage.getItem('token');
                              if (!token) { e.preventDefault(); return; }
                              // axios header is set automatically but for direct link we need to use fetch
                              e.preventDefault();
                              fetch(backupAPI.download(b.name), {
                                headers: { 'Authorization': `Bearer ${token}` }
                              }).then(res => res.blob()).then(blob => {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = b.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                            title="ดาวน์โหลด"
                          >
                            <Download size={14} />
                            ดาวน์โหลด
                          </a>
                          <button
                            onClick={() => setConfirmRestore(b.name)}
                            disabled={restoringName === b.name}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            title="กู้คืน"
                          >
                            <RefreshCw size={14} className={restoringName === b.name ? 'animate-spin' : ''} />
                            กู้คืน
                          </button>
                          <button
                            onClick={() => setConfirmDelete(b.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                            title="ลบ"
                          >
                            <Trash2 size={14} />
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

          {/* Confirm Delete Modal */}
          {confirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบ</h3>
                </div>
                <p className="mb-6 text-sm text-slate-600">
                  ต้องการลบไฟล์ backup <span className="font-semibold">{confirmDelete}</span> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(confirmDelete)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Restore Modal */}
          {confirmRestore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">ยืนยันการกู้คืน</h3>
                </div>
                <p className="mb-2 text-sm text-slate-600">
                  ต้องการกู้คืนฐานข้อมูลจาก <span className="font-semibold">{confirmRestore}</span> ใช่หรือไม่?
                </p>
                <p className="mb-6 text-xs text-amber-600">
                  ระบบจะสำรองฐานข้อมูลปัจจุบันไว้ก่อน และคุณจะต้อง restart server หลังกู้คืน
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmRestore(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleRestoreBackup(confirmRestore)}
                    disabled={restoringName !== null}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {restoringName ? 'กำลังกู้คืน...' : 'กู้คืน'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
