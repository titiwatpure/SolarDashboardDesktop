// App.jsx — ไฟล์หลักของ Frontend
// จัดการ Routing สุดทั้งหมดผ่านที่นี่
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Organizations from './pages/Organizations';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Steps from './pages/Steps';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import NetworkMap from './pages/NetworkMap';
import ProjectDetail from './pages/ProjectDetail';
import ProjectReport from './pages/ProjectReport';
import { Component, useState } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">เกิดข้อผิดพลาด</p>
            <p className="mt-2 text-sm text-slate-500">กรุณารีเฟรชหน้าเว็บ</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              รีเฟรช
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <div className="min-h-screen lg:pl-72">
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        <main className="px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/steps" element={<Steps />} />
            <Route path="/network-map" element={<NetworkMap />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/report" element={<ProjectReport />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
