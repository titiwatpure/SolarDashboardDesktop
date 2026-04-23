import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  CheckSquare,
  Building2,
  FileText,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
} from 'lucide-react';

/**
 * รายการเมนูในแถบด้านข้าง
 * label: ชื่อที่แสดงในเมนู
 * icon: ไอคอนที่ใช้
 * path: เส้นทาง URL
 */
const menuItems = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, path: '/' },
  { id: 'projects', label: 'โครงการ', icon: Zap, path: '/projects' },
  { id: 'steps', label: 'ขั้นตอนงาน', icon: CheckSquare, path: '/steps' },
  { id: 'organizations', label: 'หน่วยงาน', icon: Building2, path: '/organizations' },
  { id: 'documents', label: 'เอกสาร', icon: FileText, path: '/documents' },
  { id: 'reports', label: 'รายงาน', icon: BarChart3, path: '/reports' },
  { id: 'users', label: 'ผู้ใช้งาน', icon: Users, path: '/users' },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings, path: '/settings' },
];

export default function Sidebar({ isOpen, onClose, userRole }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Menu items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">© 2024 Solar Dashboard</p>
          </div>
        </div>
      </aside>
    </>
  );
}
