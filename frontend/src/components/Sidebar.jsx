import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Building2, CalendarDays, CheckSquare, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, FileText, LayoutDashboard, LogOut, Map, Settings, Users, UserCircle,
  Zap, LayoutGrid, Wallet, BookOpen, FileCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

// ===== Menu Groups =====
const menuGroups = [
  {
    id: 'home', label: 'หน้าหลัก', icon: LayoutDashboard,
    children: [
      { id: 'dashboard', label: 'หน้าหลัก', path: '/', roles: ['admin', 'engineer', 'staff'] },
      { id: 'executive-report', label: 'รายงานผู้บริหาร', path: '/executive-report', roles: ['admin', 'engineer'] },
      { id: 'knowledge-base', label: 'Knowledge Base', path: '/knowledge-base', roles: ['admin', 'engineer'] },
      { id: 'portal', label: 'แดชบอร์ดลูกค้า', path: '/portal', roles: ['client'] },
      { id: 'projects', label: 'โครงการทั้งหมด', path: '/projects', roles: ['admin', 'engineer', 'staff'] },
      { id: 'steps', label: 'ปฏิบัติงาน', path: '/steps', roles: ['admin', 'engineer', 'staff'] },
    ],
  },
  {
    id: 'tasks', label: 'งาน', icon: ClipboardList,
    children: [
      { id: 'tasks-list', label: 'งานที่มอบหมาย', path: '/tasks', roles: ['admin', 'engineer', 'staff'] },
      { id: 'calendar', label: 'ปฏิทินงาน', path: '/calendar', roles: ['admin', 'engineer', 'staff'] },
    ],
  },
  {
    id: 'doc-review', label: 'ตรวจเอกสาร / ยื่นหน่วยงาน', icon: FileCheck,
    children: [
      { id: 'doc-review-dashboard', label: 'แดชบอร์ดเอกสาร', path: '/doc-review', roles: ['admin', 'engineer', 'staff'] },
      { id: 'doc-review-pending-revisions', label: 'เอกสารต้องแก้', path: '/doc-review/pending-revisions', roles: ['admin', 'engineer', 'staff'] },
      { id: 'doc-review-ready-to-submit', label: 'สรุปส่งหน่วยงานวันนี้', path: '/doc-review/ready-to-submit', roles: ['admin', 'engineer', 'staff'] },
      { id: 'doc-review-open-issues', label: 'ปัญหาเอกสาร', path: '/doc-review/open-issues', roles: ['admin', 'engineer', 'staff'] },
      { id: 'doc-review-new', label: 'สร้างโครงการตรวจเอกสาร', path: '/doc-review/new', roles: ['admin', 'engineer'] },
      { id: 'doc-review-templates', label: 'Template Checklist', path: '/doc-review/templates', roles: ['admin', 'engineer'] },
      { id: 'doc-review-agency-tracking', label: 'ติดตามยื่นหน่วยงาน', path: '/doc-review/agency-tracking', roles: ['admin', 'engineer', 'staff'] },
    ],
  },
  {
    id: 'org-docs', label: 'เอกสารและหน่วยงาน', icon: FileText,
    children: [
      { id: 'documents', label: 'เอกสาร', path: '/documents', roles: ['admin', 'engineer', 'staff'] },
      { id: 'organizations', label: 'หน่วยงาน', path: '/organizations', roles: ['admin', 'engineer', 'staff'] },
      { id: 'organization-contacts', label: 'เจ้าหน้าที่หน่วยงาน', path: '/organization-contacts', roles: ['admin', 'engineer', 'staff'] },
      { id: 'customers', label: 'ลูกค้า', path: '/customers', roles: ['admin', 'engineer', 'staff'] },
    ],
  },
  {
    id: 'finance', label: 'การเงินและรายงาน', icon: Wallet,
    children: [
      { id: 'accounting', label: 'บัญชี', path: '/accounting', roles: ['admin', 'engineer'] },
      { id: 'reports', label: 'รายงาน', path: '/reports', roles: ['admin', 'engineer', 'staff'] },
      { id: 'network-map', label: 'แผนที่โครงการ', path: '/network-map', roles: ['admin', 'engineer', 'staff'] },
    ],
  },
  {
    id: 'system', label: 'ระบบ', icon: Settings,
    children: [
      { id: 'users', label: 'ผู้ใช้งาน', path: '/users', roles: ['admin'] },
      { id: 'help', label: 'คู่มือ', path: '/help', roles: ['admin', 'engineer', 'staff', 'client'] },
      { id: 'settings', label: 'ตั้งค่า', path: '/settings', roles: ['admin', 'engineer', 'staff', 'client'] },
    ],
  },
];

function BrandMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
      <div className="absolute top-1.5 h-2.5 w-5 rounded-full bg-amber-300" />
      <div className="absolute top-2.5 h-0.5 w-6 bg-amber-200/80" />
      <div className="h-3 w-5 rounded-b-full border-2 border-amber-200 border-t-0" />
      <div className="absolute bottom-1.5 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[11px] border-l-transparent border-r-transparent border-t-sky-400/90" />
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [openGroups, setOpenGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sidebar-open-groups') || '["home"]'); } catch { return ['home']; }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem('sidebar-open-groups', JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  // Auto-expand group based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    for (const group of menuGroups) {
      if (group.children.some(c => c.path === currentPath || (c.path !== '/' && currentPath.startsWith(c.path)))) {
        if (!openGroups.includes(group.id)) {
          setOpenGroups(prev => [...prev, group.id]);
        }
      }
    }
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const isGroupActive = (group) => group.children.some(c => isActive(c.path));

  const handleLogout = () => { logout(); navigate('/login'); };

  const collapsedWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-all duration-300 ${collapsedWidth} ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className={`flex items-center border-b border-white/10 px-4 py-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
              <BrandMark />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">Solar Project</p>
                <p className="text-[10px] text-slate-400">Dashboard</p>
              </div>
            </Link>
          )}
          {collapsed && <Link to="/" onClick={onClose}><BrandMark /></Link>}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden">
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700">
          {menuGroups.map(group => {
            const hasAccess = group.children.some(c => c.roles.includes(user?.role));
            if (!hasAccess) return null;
            const isOpenGroup = openGroups.includes(group.id);
            const active = isGroupActive(group);

            if (collapsed) {
              // Compact mode — show group icon
              return (
                <div key={group.id} className="relative group">
                  <button onClick={() => { setCollapsed(false); setOpenGroups(prev => [...prev, group.id]); }}
                    className={`w-full flex items-center justify-center rounded-xl p-2.5 transition ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    title={group.label}>
                    <group.icon size={18} />
                  </button>
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                    <div className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-lg">{group.label}</div>
                  </div>
                </div>
              );
            }

            // Expanded mode — group with children
            return (
              <div key={group.id}>
                <button onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? 'text-white bg-white/5' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}>
                  <group.icon size={17} className={active ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isOpenGroup ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isOpenGroup ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-3 pl-3 border-l border-slate-700/50 space-y-0.5 py-1">
                    {group.children.filter(c => c.roles.includes(user?.role)).map(child => {
                      const childActive = isActive(child.path);
                      return (
                        <Link key={child.id} to={child.path} onClick={onClose}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                            childActive ? 'bg-blue-600/90 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${childActive ? 'bg-blue-400' : 'bg-transparent'}`} />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/10 p-3">
          <div className={`rounded-xl bg-white/5 p-3 ring-1 ring-white/10 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">
                {(user?.full_name || user?.username || 'U').charAt(0)}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{user?.full_name || user?.username}</p>
                  <p className="text-[10px] text-slate-400">{ROLES[user?.role] || user?.role}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white">
                <LogOut size={14} />ออกจากระบบ
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
