import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Shield, Globe, User, Lock, Eye, EyeOff, Database, Download, Trash2, RefreshCw, HardDrive, AlertTriangle, CheckCircle, Edit3, X, Save, Building2, Monitor, Users as UsersIcon, ChevronDown, ChevronUp, LogOut, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, usersAPI, backupAPI } from '../utils/api';
import { ROLES } from '../utils/constants';
import { useProfileEdit, useCompanySettings, useBackupManagement } from '../hooks/useSettings';

// Permission matrix (mirror of backend middleware/auth.js)
const PERMISSION_MATRIX = {
  admin: [
    'project.create', 'project.update.own', 'project.update.all', 'project.delete',
    'task.create', 'task.assign', 'task.delete',
    'document.upload', 'document.delete',
    'checkpoint.approve',
    'report.view', 'report.export',
    'user.manage', 'org.manage', 'audit.view',
    'approval.manage',
  ],
  engineer: [
    'project.create', 'project.update.own',
    'task.create', 'task.assign',
    'document.upload',
    'checkpoint.approve',
    'report.view', 'report.export',
  ],
  staff: [
    'project.create',
    'task.create',
    'document.upload',
    'report.view', 'report.export',
  ],
  client: [
    'report.view',
  ],
};

const PERMISSION_LABELS = {
  'project.create': 'สร้างโครงการ',
  'project.update.own': 'แก้ไขโครงการตัวเอง',
  'project.update.all': 'แก้ไขโครงการทั้งหมด',
  'project.delete': 'ลบโครงการ',
  'task.create': 'สร้างงาน',
  'task.assign': 'มอบหมายงาน',
  'task.delete': 'ลบงาน',
  'document.upload': 'อัปโหลดเอกสาร',
  'document.delete': 'ลบเอกสาร',
  'checkpoint.approve': 'อนุมัติ Checkpoint',
  'report.view': 'ดูรายงาน',
  'report.export': 'ส่งออกรายงาน',
  'user.manage': 'จัดการผู้ใช้',
  'org.manage': 'จัดการหน่วยงาน',
  'audit.view': 'ดู Audit Log',
  'approval.manage': 'จัดการอนุมัติ',
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

export default function Settings() {
  const { user, changePassword, refreshUser } = useAuth();
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

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // Roles state
  const [allUsers, setAllUsers] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesMessage, setRolesMessage] = useState({ type: '', text: '' });
  const [showPermissions, setShowPermissions] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Hooks
  const profile = useProfileEdit(user, refreshUser);
  const company = useCompanySettings(isAdmin);
  const backup = useBackupManagement(isAdmin);

  // ========================
  // Password
  // ========================
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

  // ========================
  // Sessions
  // ========================
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await authAPI.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLogoutAll = async () => {
    if (!window.confirm('ต้องการออกจากระบบทุกอุปกรณ์ใช่หรือไม่? คุณจะต้อง login ใหม่')) return;
    setLogoutAllLoading(true);
    try {
      await authAPI.logoutAll();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout all failed:', err);
      setLogoutAllLoading(false);
    }
  };

  // ========================
  // Roles & Permissions
  // ========================
  const loadAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    setRolesLoading(true);
    try {
      const data = await usersAPI.getAll({ limit: 100 });
      setAllUsers(data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setRolesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  const handleChangeRole = async (userId, newRole) => {
    setRolesMessage({ type: '', text: '' });
    try {
      await usersAPI.update(userId, { role: newRole });
      setRolesMessage({ type: 'success', text: 'เปลี่ยนบทบาทสำเร็จ' });
      loadAllUsers();
      setTimeout(() => setRolesMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setRolesMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    }
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

      {/* ======================== */}
      {/* 1. Profile Info + Edit   */}
      {/* ======================== */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <User size={24} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลผู้ใช้</h2>
          </div>
          {!profile.isEditingProfile && (
            <button
              onClick={profile.handleStartEditProfile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              <Edit3 size={14} />
              แก้ไข
            </button>
          )}
        </div>

        {profile.profileSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle size={16} />
            {profile.profileSuccess}
          </div>
        )}

        {profile.isEditingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={profile.profileForm.full_name}
                onChange={(e) => profile.setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกชื่อ-นามสกุล"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
              <input
                type="email"
                value={profile.profileForm.email}
                onChange={(e) => profile.setProfileForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกอีเมล"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={profile.profileForm.phone}
                onChange={(e) => profile.setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                placeholder="กรอกเบอร์โทรศัพท์"
              />
            </div>

            {profile.profileError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{profile.profileError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={profile.handleSaveProfile}
                disabled={profile.profileLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {profile.profileLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={profile.handleCancelEditProfile}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <X size={16} />
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
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
              <span className="text-sm text-slate-500">เบอร์โทรศัพท์</span>
              <span className="text-sm font-medium text-slate-900">{user?.phone || '-'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">บทบาท</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user?.role === 'engineer' ? 'bg-blue-100 text-blue-800' :
                user?.role === 'staff' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {ROLES[user?.role] || user?.role}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ======================== */}
      {/* 2. Change Password       */}
      {/* ======================== */}
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

      {/* ======================== */}
      {/* 3. Notification Settings */}
      {/* ======================== */}
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

      {/* ======================== */}
      {/* 4. Session Management    */}
      {/* ======================== */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Monitor size={24} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Session ที่ Active</h2>
            <p className="text-xs text-slate-400">อุปกรณ์ที่ล็อกอินอยู่ ({sessions.length} session)</p>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="py-3 text-center text-sm text-slate-400">กำลังโหลด...</div>
        ) : sessions.length === 0 ? (
          <div className="py-3 text-center text-sm text-slate-400">ไม่มี session ที่ active</div>
        ) : (
          <div className="mb-4 space-y-1.5">
            {sessions.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className={idx === 0 ? 'text-green-500' : 'text-slate-300'}>●</span>
                <span className="font-medium text-slate-700">{idx === 0 ? 'อุปกรณ์ปัจจุบัน' : `อุปกรณ์ #${idx + 1}`}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{backup.formatDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleLogoutAll}
          disabled={logoutAllLoading || sessions.length === 0}
          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={16} />
          {logoutAllLoading ? 'กำลังออก...' : 'ออกจากระบบทุกอุปกรณ์'}
        </button>
      </div>

      {/* ======================== */}
      {/* 5. Company Info (Admin)  */}
      {/* ======================== */}
      {isAdmin && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลบริษัท</h2>
              <p className="text-xs text-slate-400">ใช้ในรายงาน PDF และเอกสาร (Admin only)</p>
            </div>
          </div>

          {company.companyMessage.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              company.companyMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {company.companyMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {company.companyMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อบริษัท</label>
              <input
                type="text"
                value={company.companyForm.company_name}
                onChange={(e) => company.setCompanyForm((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                placeholder="ชื่อบริษัท"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
              <textarea
                value={company.companyForm.address}
                onChange={(e) => company.setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
                rows={3}
                placeholder="ที่อยู่บริษัท"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทร</label>
                <input
                  type="tel"
                  value={company.companyForm.phone}
                  onChange={(e) => company.setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  placeholder="เบอร์โทร"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
                <input
                  type="email"
                  value={company.companyForm.email}
                  onChange={(e) => company.setCompanyForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  placeholder="อีเมล"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขผู้เสียภาษี</label>
                <input
                  type="text"
                  value={company.companyForm.tax_id}
                  onChange={(e) => company.setCompanyForm((p) => ({ ...p, tax_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  placeholder="เลขผู้เสียภาษี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL โลโก้</label>
                <input
                  type="url"
                  value={company.companyForm.logo_url}
                  onChange={(e) => company.setCompanyForm((p) => ({ ...p, logo_url: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่จัดเก็บไฟล์เอกสาร</label>
              <input
                type="text"
                value={company.companyForm.storage_path || ''}
                onChange={(e) => company.setCompanyForm((p) => ({ ...p, storage_path: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                placeholder="เช่น D:\Documents\Solar หรือ \\NAS\share\solar (ว่าง = ใช้ค่าเริ่มต้น)"
              />
              <p className="mt-1 text-xs text-slate-400">กำหนดไดรฟ์หรือโฟลเดอร์สำหรับจัดเก็บเอกสารอัปโหลด (ว่าง = ใช้โฟลเดอร์ uploads ในโปรเจกต์)</p>
            </div>

            <button
              onClick={company.handleSaveCompany}
              disabled={company.companyLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {company.companyLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบริษัท'}
            </button>
          </div>
        </div>
      )}

      {/* ======================== */}
      {/* 6. Roles & Permissions   */}
      {/* ======================== */}
      {isAdmin && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <UsersIcon size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">จัดการบทบาทและสิทธิ์</h2>
              <p className="text-xs text-slate-400">ดูและเปลี่ยนบทบาทผู้ใช้ + ตารางสิทธิ์ (Admin only)</p>
            </div>
          </div>

          {rolesMessage.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              rolesMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {rolesMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {rolesMessage.text}
            </div>
          )}

          {/* Users list */}
          {rolesLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : (
            <div className="mb-5 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">ผู้ใช้</th>
                    <th className="px-4 py-2.5 text-left font-semibold">อีเมล</th>
                    <th className="px-4 py-2.5 text-left font-semibold">สถานะ</th>
                    <th className="px-4 py-2.5 text-left font-semibold">บทบาท</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <div>
                          <span className="font-medium text-slate-900">{u.full_name || u.username}</span>
                          {u.username === user?.username && (
                            <span className="ml-2 text-xs text-blue-600">(คุณ)</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">@{u.username}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          disabled={u.username === user?.username}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          {Object.entries(ROLES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Permission Matrix */}
          <div>
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              {showPermissions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              ตารางสิทธิ์ (Permission Matrix)
            </button>

            {showPermissions && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">สิทธิ์</th>
                      {Object.entries(ROLES).map(([key, label]) => (
                        <th key={key} className="px-3 py-2 text-center font-semibold text-slate-500">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ALL_PERMISSIONS.map((perm) => (
                      <tr key={perm} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 text-slate-700">
                          <span className="font-mono text-xs">{perm}</span>
                          <span className="ml-2 text-slate-400">{PERMISSION_LABELS[perm]}</span>
                        </td>
                        {Object.keys(ROLES).map((role) => (
                          <td key={role} className="px-3 py-2 text-center">
                            {PERMISSION_MATRIX[role]?.includes(perm) ? (
                              <span className="text-green-600 font-bold">✓</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== */}
      {/* 7. Database Backup       */}
      {/* ======================== */}
      {isAdmin && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Database size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">สำรองฐานข้อมูล</h2>
              <p className="text-xs text-slate-400">จัดการไฟล์ backup ของฐานข้อมูล (Admin only)</p>
            </div>
          </div>

          {backup.backupMessage.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              backup.backupMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {backup.backupMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {backup.backupMessage.text}
            </div>
          )}

          <button
            onClick={backup.handleCreateBackup}
            disabled={backup.backupLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-5"
          >
            <HardDrive size={16} />
            {backup.backupLoading ? 'กำลังสำรอง...' : 'สำรองฐานข้อมูลตอนนี้'}
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
                {backup.backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      ยังไม่มีไฟล์ backup
                    </td>
                  </tr>
                ) : (
                  backup.backups.map((b) => (
                    <tr key={b.name} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                      <td className="px-4 py-3 text-slate-600">{backup.formatFileSize(b.size)}</td>
                      <td className="px-4 py-3 text-slate-600">{backup.formatDate(b.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={backupAPI.download(b.name)}
                            onClick={(e) => {
                              const token = localStorage.getItem('token');
                              if (!token) { e.preventDefault(); return; }
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
                            onClick={() => backup.setConfirmRestore(b.name)}
                            disabled={backup.restoringName === b.name}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            title="กู้คืน"
                          >
                            <RefreshCw size={14} className={backup.restoringName === b.name ? 'animate-spin' : ''} />
                            กู้คืน
                          </button>
                          <button
                            onClick={() => backup.setConfirmDelete(b.name)}
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
          {backup.confirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบ</h3>
                </div>
                <p className="mb-6 text-sm text-slate-600">
                  ต้องการลบไฟล์ backup <span className="font-semibold">{backup.confirmDelete}</span> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => backup.setConfirmDelete(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => backup.handleDeleteBackup(backup.confirmDelete)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Restore Modal */}
          {backup.confirmRestore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">ยืนยันการกู้คืน</h3>
                </div>
                <p className="mb-2 text-sm text-slate-600">
                  ต้องการกู้คืนฐานข้อมูลจาก <span className="font-semibold">{backup.confirmRestore}</span> ใช่หรือไม่?
                </p>
                <p className="mb-6 text-xs text-amber-600">
                  ระบบจะสำรองฐานข้อมูลปัจจุบันไว้ก่อน และคุณจะต้อง restart server หลังกู้คืน
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => backup.setConfirmRestore(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => backup.handleRestoreBackup(backup.confirmRestore)}
                    disabled={backup.restoringName !== null}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {backup.restoringName ? 'กำลังกู้คืน...' : 'กู้คืน'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================== */}
      {/* 8. Update History        */}
      {/* ======================== */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <History size={24} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">ประวัติเวอร์ชัน</h2>
            <p className="text-xs text-slate-400">บันทึกการอัปเดตแต่ละเวอร์ชัน</p>
          </div>
        </div>

        <div className="space-y-4">
          {CHANGELOG.map((entry, idx) => (
            <div key={entry.version} className={`relative pl-8 ${idx < CHANGELOG.length - 1 ? 'pb-4 border-l-2 border-slate-200 ml-3' : 'ml-3'}`}>
              <div className="absolute left-[-7px] top-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900">v{entry.version}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-sm text-slate-600">{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CHANGELOG = [
  {
    version: '1.0.5',
    date: '2026-05-16',
    changes: [
      'เพิ่มเมนู "ใบเสนอราคา" ใน Sidebar (โค้ดมีอยู่แล้วแต่ไม่ได้เชื่อม)',
      'เพิ่ม route /quotations ใน App Router',
      'เปิด SQLite WAL mode + performance PRAGMAs (เร็วขึ้น 2-3x)',
      'แก้ schema mismatch: เพิ่ม 10 columns ที่หายไปใน projects table',
      'แก้ phantom index: เพิ่ม user_id column ใน customers table',
      'เพิ่ม transaction support ใน database.js (BEGIN/COMMIT/ROLLBACK)',
      'แก้ query routing รองรับ CTE (WITH ... SELECT)',
      'แก้ดาวน์โหลดเอกสารไม่ได้ (ใช้ axios + auth header)',
      'แก้งวดชำระชำระแล้วไม่อัปเดตหน้าบัญชีโครงการ',
      'เพิ่มปุ่มส่งออกข้อมูลบัญชีเป็น CSV',
      'เพิ่มฟิลเตอร์บัญชี (โครงการ/ประเภท/วันที่)',
      'เพิ่มตั้งค่าที่จัดเก็บไฟล์เอกสาร (เลือกไดรฟ์/โฟลเดอร์)',
      'แก้ไขบันทึกชำระไม่ categorize หมวดหมู่อัตโนมัติ',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-05-15',
    changes: [
      'แก้ไขระบบหน่วยงาน: เพิ่มปุ่มอนุมัติ/ปฏิเสธ + แสดงสถานะอนุมัติ',
      'เพิ่ม notification เมื่ออนุมัติ/ปฏิเสธหน่วยงาน',
      'เพิ่ม GET /api/organizations/:id endpoint',
      'validate ประเภทหน่วยงาน (org_type) ที่ backend',
      'ปรับปรุง error handling และ loading state ทั้งระบบ',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-05-15',
    changes: [
      'เพิ่ม composite indexes สำหรับ report queries ที่ช้า',
      'เพิ่ม auto-vacuum ทุกเดือน (บีบอัดไฟล์ DB อัตโนมัติ)',
      'เพิ่ม auto-cleanup logs เก่าเกิน 1 ปี',
      'เพิ่ม API endpoints สำหรับ manual vacuum/cleanup (admin only)',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-05-14',
    changes: [
      'แก้ bug migration ไม่ทำงานตอนอัปเดตแอพ',
      'รัน migration ทุกครั้งที่เปิดแอพ (ปลอดภัยสำหรับ db เดิม)',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-05-14',
    changes: [
      'เพิ่มระบบอัปเดตอัตโนมัติ (electron-updater)',
      'เพิ่ม GitHub Actions สำหรับ build & release อัตโนมัติ',
      'แสดงเวอร์ชันปัจจุบันที่ Sidebar',
      'เพิ่มประวัติเวอร์ชันในหน้าตั้งค่า',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-14',
    changes: [
      'เปิดตัว Solar Dashboard Desktop App',
      'ระบบติดตามโครงการ Solar ครบวงจร',
      'รองรับ 4 บทบาท: Admin, Engineer, Staff, Client',
      'ขั้นตอนดำเนินงาน 7 ขั้น: Survey → COD',
      'แผนที่เครือข่าย, รายงาน, สัญญา, บัญชี',
    ],
  },
];
