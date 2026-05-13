import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { setAuthToken, setRefreshToken, authAPI, usersAPI, decodeJWT, refreshAccessToken } from '../utils/api';

const AuthContext = createContext(null);

// ตั้ง refresh ก่อน token หมดอายุ (วินาที)
const REFRESH_BEFORE_EXPIRY_SEC = 60;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // ตั้ง timer ให้ refresh อัตโนมัติก่อน token หมดอายุ
  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = decodeJWT(token);
    if (!payload?.exp) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const delayMs = Math.max((payload.exp - nowSec - REFRESH_BEFORE_EXPIRY_SEC) * 1000, 5000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshAccessToken();
        startRefreshTimer(); // ตั้ง timer ใหม่หลัง refresh สำเร็จ
      } catch {
        // refresh ไม่สำเร็จ → ให้ interceptor จัดการ logout เมื่อมี request ถัดไป
      }
    }, delayMs);
  }, []);

  // ตรวจสอบ token จาก localStorage ตอนโหลด
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setAuthToken(token);
      try {
        setUser(JSON.parse(storedUser));
        startRefreshTimer();
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [startRefreshTimer]);

  // Login
  const login = useCallback(async (username, password) => {
    const res = await authAPI.login(username, password);
    const { token, accessToken, refreshToken: refresh, user: userData } = res;

    setAuthToken(token || accessToken);
    if (refresh) setRefreshToken(refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    startRefreshTimer();
    return userData;
  }, [startRefreshTimer]);

  // Logout
  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try { await authAPI.logout(); } catch { /* ล้าง local เสมอ */ }
    setAuthToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  // Refresh user profile
  const refreshUser = useCallback(async () => {
    try {
      const res = await usersAPI.getProfile();
      const userData = res.data || res;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await usersAPI.changePassword(currentPassword, newPassword);
    return res;
  }, []);

  const isAdmin = user?.role === 'admin';

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    refreshUser,
    changePassword,
    isAdmin,
  }), [user, loading, login, logout, refreshUser, changePassword, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
