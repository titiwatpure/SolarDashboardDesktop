import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isSubmitting = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError('');
    setLoading(true);

    try {
      await login(credentials.username, credentials.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      setLoading(false);
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-card-lg p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary-600 p-3 rounded-lg">
              <Zap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Solar Dashboard</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ระบุชื่อผู้ใช้"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ระบุรหัสผ่าน"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 mt-6"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Demo info — แสดงเฉพาะ dev เท่านั้น */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold mb-2">ทดลองใช้ (รหัสผ่าน = ชื่อผู้ใช้):</p>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>admin</strong> — ผู้ดูแลระบบ (สิทธิ์เต็ม)</p>
                <p><strong>engineer</strong> — วิศวกร (จัดการโครงการ/งาน)</p>
                <p><strong>staff</strong> — เจ้าหน้าที่ (ดู/สร้างโครงการ)</p>
                <p><strong>client</strong> — ลูกค้า (ดูรายงาน)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
