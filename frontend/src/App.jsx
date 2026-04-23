/**
 * Solar Dashboard Frontend - หน้าเว็บสำหรับระบบติดตามโครงการ Solar
 * 
 * วัตถุประสงค์:
 * - แสดงข้อมูลโครงการและสถานะ
 * - จัดการผู้ใช้ เอกสาร รายงาน
 * - ให้ส่วนต่อประสาน (UI) ที่ใช้งานง่าย
 * 
 * เทคโนโลยี:
 * - React: UI Framework
 * - React Router: นำทางระหว่างหน้า
 * - Tailwind CSS: ออกแบบ CSS
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';              // เมนูด้านข้าง
import Header from './components/Header';                // ส่วนหัวของหน้า
import Login from './pages/Login';                      // หน้าเข้าสู่ระบบ
import Dashboard from './pages/Dashboard';              // หน้าแดชบอร์ด
import Projects from './pages/Projects';                // หน้าโครงการ
import Organizations from './pages/Organizations';      // หน้าหน่วยงาน
import Documents from './pages/Documents';              // หน้าเอกสาร
import Reports from './pages/Reports';                  // หน้ารายงาน
import Users from './pages/Users';                      // หน้าผู้ใช้
import Settings from './pages/Settings';                // หน้าตั้งค่า
import Steps from './pages/Steps';                      // หน้าขั้นตอนงาน
import { setAuthToken } from './utils/api';

/**
 * หลักของแอปพลิเคชัน - ตรวจสอบการเข้าสู่ระบบและจัดการการแสดงผล
 */
function AppContent() {
  const [user, setUser] = useState(null);        // ข้อมูลผู้ใช้ที่เข้าสู่ระบบ
  const [sidebarOpen, setSidebarOpen] = useState(false);  // สถานะการเปิด/ปิดเมนู
  const navigate = useNavigate();                 // ฟังก์ชันนำทาง

  // ตรวจสอบข้อมูลการเข้าสู่ระบบเมื่อหน้าโหลด
  useEffect(() => {
    const token = localStorage.getItem('token');         // อ่าน token จาก Local Storage
    const storedUser = localStorage.getItem('user');     // อ่านข้อมูลผู้ใช้จาก Local Storage

    if (token && storedUser) {
      // หากมี token ให้ตั้งค่า Authorization header
      setAuthToken(token);
      setUser(JSON.parse(storedUser));
    } else {
      // ถ้าไม่มี token ให้นำทางไปยังหน้าเข้าสู่ระบบ
      navigate('/login');
    }
  }, [navigate]);

  /**
   * ฟังก์ชั่นออกจากระบบ
   * - ลบ token และข้อมูลผู้ใช้
   * - นำทางกลับไปหน้าเข้าสู่ระบบ
   */
  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user) {
    return <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Login />} />
    </Routes>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />

      <div className="flex flex-col flex-1 overflow-hidden lg:ml-64">
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/steps" element={<Steps />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
