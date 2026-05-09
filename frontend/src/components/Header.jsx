import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export default function Header({ user, onLogout, onToggleSidebar }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleString('th-TH', {
        dateStyle: 'long',
        timeStyle: 'short'
      }),
    []
  );

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

          <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <Bell size={18} />
            <span className="absolute right-2 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              5
            </span>
          </button>

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
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                  <User size={16} />
                  โปรไฟล์
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                  <Settings size={16} />
                  ตั้งค่าบัญชี
                </button>
                <button
                  onClick={onLogout}
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
