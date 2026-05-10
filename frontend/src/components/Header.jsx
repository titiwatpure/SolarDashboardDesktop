import { Bell, LogOut, Menu, Settings, User, Check, Trash2, CheckCheck, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { notificationsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/': 'ภาพรวมโครงการ',
  '/projects': 'โครงการทั้งหมด',
  '/steps': 'ปฏิบัติงาน',
  '/organizations': 'หน่วยงาน',
  '/documents': 'เอกสาร',
  '/reports': 'รายงาน',
  '/users': 'ผู้ใช้งาน',
  '/settings': 'ตั้งค่า'
};

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res?.count || 0);
    } catch {
      // เงียบไว้
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleString('th-TH', {
        dateStyle: 'long',
        timeStyle: 'short'
      }),
    []
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(res?.data || []);
    } catch {
      // เงียบไว้
    } finally {
      setLoadingNotifs(false);
    }
  };

  const toggleNotif = () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    if (next) loadNotifications();
  };

  const handleMarkRead = async (notifId) => {
    try {
      await notificationsAPI.markAsRead(notifId);
      setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, is_read: 1 } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDeleteNotif = async (notifId) => {
    try {
      await notificationsAPI.delete(notifId);
      const wasUnread = notifications.find((n) => n.id === notifId && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-5 md:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {pageTitles[location.pathname] || 'Solar Dashboard'}
            </h2>
            <p className="mt-1 hidden text-sm text-slate-500 md:block">
              ติดตามสถานะงานและภาพรวมข้อมูลในระบบแบบเรียลไทม์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm xl:block">
            วันที่ {todayLabel} น.
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotif}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-96 max-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <CheckCheck size={14} />
                      อ่านทั้งหมด
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                  {loadingNotifs ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">ไม่มีการแจ้งเตือน</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) handleMarkRead(n.id);
                          if (n.entity_type === 'project' && n.entity_id) {
                            navigate(`/projects/${n.entity_id}`);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 transition cursor-pointer hover:bg-slate-50 ${
                          n.is_read ? 'bg-white' : 'bg-blue-50/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.is_read && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="rounded-full p-1.5 text-blue-500 hover:bg-blue-50 transition-colors"
                              title="อ่านแล้ว"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotif(n.id)}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="hidden text-right md:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-slate-500">{user?.role === 'admin' ? 'Administrator' : 'Engineer'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <User size={18} />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                <button
                  onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <User size={16} />
                  โปรไฟล์
                </button>
                <button
                  onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <Settings size={16} />
                  ตั้งค่าบัญชี
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
