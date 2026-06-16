import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { setAuthToken, setRefreshToken, authAPI, usersAPI, decodeJWT, refreshAccessToken } from '../utils/api';

const AuthContext = createContext(null);

const REFRESH_BEFORE_EXPIRY_SEC = 60;

function getUserFromStorage() {
  try {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      // ตรวจสอบ token หมดอายุหรือยัง
      const payload = decodeJWT(token);
      if (payload?.exp) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec) {
          // Token หมดอายุ → ล้างข้อมูล
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          return null;
        }
      }
      const user = JSON.parse(storedUser);
      // ใช้ role จาก decoded JWT เป็น source of truth (ป้องกัน localStorage spoofing)
      if (payload?.role) {
        user.role = payload.role;
      }
      setAuthToken(token);
      return user;
    }
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUserFromStorage());
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

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
        startRefreshTimer();
      } catch {
        // refresh failed — interceptor handles logout on next request
      }
    }, delayMs);
  }, []);

  useEffect(() => {
    if (user) {
      startRefreshTimer();
    }
    setLoading(false);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [user, startRefreshTimer]);

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

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try { await authAPI.logout(); } catch { /* clear local anyway */ }
    setAuthToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

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
