import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard, path: '/' },
  { id: 'projects', label: 'โครงการทั้งหมด', icon: Zap, path: '/projects' },
  { id: 'steps', label: 'ปฏิบัติงาน', icon: CheckSquare, path: '/steps' },
  { id: 'organizations', label: 'หน่วยงาน', icon: Building2, path: '/organizations' },
  { id: 'documents', label: 'เอกสาร', icon: FileText, path: '/documents' },
  { id: 'reports', label: 'รายงาน', icon: BarChart3, path: '/reports' },
  { id: 'users', label: 'ผู้ใช้งาน', icon: Users, path: '/users' },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings, path: '/settings' }
];

function BrandMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
      <div className="absolute top-2 h-3.5 w-6 rounded-full bg-amber-300" />
      <div className="absolute top-3.5 h-0.5 w-8 bg-amber-200/80" />
      <div className="h-4 w-7 rounded-b-full border-2 border-amber-200 border-t-0" />
      <div className="absolute bottom-2 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-sky-400/90" />
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-6 pt-7">
          <Link to="/" className="flex items-center gap-3" onClick={onClose}>
            <BrandMark />
            <div>
              <p className="text-xl font-bold tracking-tight text-white">Solar Project</p>
              <p className="text-sm text-slate-400">Dashboard</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {(user?.full_name || user?.username || 'U').charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.full_name || user?.username}</p>
                <p className="text-xs text-slate-400">{user?.role === 'admin' ? 'Admin' : 'Engineer'}</p>
              </div>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {userMenuOpen && (
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); onClose(); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Settings size={16} />
                  ตั้งค่าบัญชี
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            )}

            {!userMenuOpen && (
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <LogOut size={16} />
                ออกจากระบบ
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
