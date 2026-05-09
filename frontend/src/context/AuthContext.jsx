import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, authAPI, usersAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ตรวจสอบ token จาก localStorage ตอนโหลด
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setAuthToken(token);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Login
  const login = useCallback(async (username, password) => {
    const res = await authAPI.login(username, password);
    const { token, user: userData } = res;

    setAuthToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ล้าง local เสมอ */ }
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    changePassword,
    isAdmin: user?.role === 'admin',
  };

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
