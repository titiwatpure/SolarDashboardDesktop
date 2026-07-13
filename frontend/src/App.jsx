// App.jsx — ไฟล์หลักของ Frontend
// จัดการ Routing สุดทั้งหมดผ่านที่นี่
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Component, Suspense, lazy, useState } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const Steps = lazy(() => import('./pages/Steps'));
const Documents = lazy(() => import('./pages/Documents'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskCalendar = lazy(() => import('./pages/TaskCalendar'));
const NetworkMap = lazy(() => import('./pages/NetworkMap'));
const Customers = lazy(() => import('./pages/Customers'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectReport = lazy(() => import('./pages/ProjectReport'));
const Contracts = lazy(() => import('./pages/Contracts'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Quotations = lazy(() => import('./pages/Quotations'));
const OrganizationContacts = lazy(() => import('./pages/OrganizationContacts'));
const Help = lazy(() => import('./pages/Help'));
const DocReviewDashboard = lazy(() => import('./pages/DocReviewDashboard'));
const DocReviewNew = lazy(() => import('./pages/DocReviewNew'));
const DocReviewDetail = lazy(() => import('./pages/DocReviewDetail'));
const DocReviewTemplateChecklists = lazy(() => import('./pages/DocReviewTemplateChecklists'));
const DocReviewAgencyTracking = lazy(() => import('./pages/DocReviewAgencyTracking'));
const DocReviewCorrectionReport = lazy(() => import('./pages/DocReviewCorrectionReport'));

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

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p className="mt-3 text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  );
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
          <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={user?.role === 'client' ? <Navigate to="/portal" replace /> : <Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/organization-contacts" element={<OrganizationContacts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<TaskCalendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/steps" element={<Steps />} />
            <Route path="/network-map" element={<NetworkMap />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/report" element={<ProjectReport />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/accounting" element={<ProtectedRoute roles={['admin', 'engineer']}><Accounting /></ProtectedRoute>} />
            <Route path="/doc-review" element={<DocReviewDashboard />} />
            <Route path="/doc-review/new" element={<DocReviewNew />} />
            <Route path="/doc-review/templates" element={<DocReviewTemplateChecklists />} />
            <Route path="/doc-review/agency-tracking" element={<DocReviewAgencyTracking />} />
            <Route path="/doc-review/correction-report/:id" element={<DocReviewCorrectionReport />} />
            <Route path="/doc-review/:id" element={<DocReviewDetail />} />
            <Route path="/help" element={<Help />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppSettingsProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
