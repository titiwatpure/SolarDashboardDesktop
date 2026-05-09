// App.jsx — ไฟล์หลักของ Frontend
// จัดการ Routing สุดทั้งหมดผ่านที่นี่
// ถ้าต้องการเพิ่มหน้าใหม่ ให้เพิ่ม import และ <Route> ในส่วน Routes ด้านล่าง
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';       // เมนูด้านซ้าย
import Header from './components/Header';         // ส่วนหัวด้านบน
import Login from './pages/Login';                // หน้าเข้าสู่ระบบ
import Dashboard from './pages/Dashboard';        // หน้าภาพรวมโครงการ
import Projects from './pages/Projects';          // หน้ารายชื่อโครงการ
import Organizations from './pages/Organizations'; // หน้าหน่วยงาน
import Reports from './pages/Reports';            // หน้ารายงาน
import Users from './pages/Users';                // หน้าจัดการผู้ใช้
import Settings from './pages/Settings';          // หน้าตั้งค่า
import Steps from './pages/Steps';                // หน้าขั้นตอนการทำงาน
import Documents from './pages/Documents';        // หน้าเอกสาร
import ProjectDetail from './pages/ProjectDetail'; // หน้ารายละเอียดโครงการ
import { setAuthToken } from './utils/api';       // ฟังก์ชันตั้งค่า Auth Token

// Component หลักที่จัดการ state ของแอปพลิเคชัน
function AppContent() {
  const [user, setUser] = useState(null);           // เก็บข้อมูลผู้ใช้ที่ล็อกอิน
  const [sidebarOpen, setSidebarOpen] = useState(false); // สถานะเปิด/ปิด Sidebar บนมือถือ
  const navigate = useNavigate();

  // ตรวจสอบ Token ที่เก็บไว้ใน localStorage ตอน component โหลด
  // ถ้ามี Token ให้ตั้งค่า auth และเซ็ต user
  // ถ้าไม่มีให้ redirect ไปหน้า login
  useEffect(() => {
    const token = localStorage.getItem('token');        // ดึง Token จาก localStorage
    const storedUser = localStorage.getItem('user');    // ดึงข้อมูล user จาก localStorage

    if (token && storedUser) {
      setAuthToken(token);                              // ตั้งค่า Token สำหรับ Axios
      try {
        setUser(JSON.parse(storedUser));                // แปลง JSON string กลับเป็น Object
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      }
    } else {
      navigate('/login');                               // ไม่มี Token ให้ไปหน้า Login
    }
  }, [navigate]);

  // ฟังก์ชันออกจากระบบ: ลบ Token และ user แล้ว redirect ไป Login
  const handleLogout = () => {
    setAuthToken(null);                     // ลบ Token จาก Axios headers
    setUser(null);                          // ล้างข้อมูล user
    localStorage.removeItem('user');        // ลบจาก localStorage
    localStorage.removeItem('token');       // ลบ Token จาก localStorage
    navigate('/login');                     // ไปหน้า Login
  };

  // ถ้ายังไม่มี user ให้แสดงแค่หน้า Login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />  {/* เส้นทางอื่นๆ ทั้งหมดให้ไป Login */}
      </Routes>
    );
  }

  // เมื่อล็อกอินแล้วให้แสดง Layout หลัก พร้อม Sidebar และ Header
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar เมนูด้านซ้าย - isOpen ใช้สำหรับมือถือ */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        user={user}
      />

      {/* พื้นที่เนื้อหาหลัก - lg:pl-72 เว้นพื้นที่ให้ Sidebar บน Desktop */}
      <div className="min-h-screen lg:pl-72">
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen((open) => !open)} // Toggle Sidebar
        />

        {/* พื้นที่แสดงหน้าต่างๆ ตาม Route */}
        <main className="px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />              {/* หน้าแรก */}
            <Route path="/projects" element={<Projects />} />       {/* รายการโครงการ */}
            <Route path="/organizations" element={<Organizations />} /> {/* หน่วยงาน */}
            <Route path="/reports" element={<Reports />} />         {/* รายงาน */}
            <Route path="/users" element={<Users />} />             {/* ผู้ใช้งาน */}
            <Route path="/documents" element={<Documents />} />     {/* เอกสาร */}
            <Route path="/settings" element={<Settings />} />       {/* ตั้งค่า */}
            <Route path="/steps" element={<Steps />} />             {/* ขั้นตอนงาน */}
            <Route path="/projects/:id" element={<ProjectDetail />} /> {/* รายละเอียดโครงการ */}
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Component ครอบสุดของแอป - ต้องครอบด้วย Router เพื่อให้ useNavigate ทำงานได้
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
