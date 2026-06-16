import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — route-level role guard
 * @param {string[]} roles - roles ที่อนุญาต (ถ้าไม่ส่ง = ต้อง login เท่านั้น)
 * @param {React.ReactNode} children - component ที่ต้องการ protect
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  // ยังโหลดอยู่ → แสดง loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  // ยังไม่ login → redirect /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // มี roles constraint → ตรวจ role
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="mt-2 text-sm text-slate-500">คุณไม่มีสิทธิ์เข้าหน้านี้</p>
          <button onClick={() => window.history.back()} className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            กลับ
          </button>
        </div>
      </div>
    );
  }

  return children;
}
