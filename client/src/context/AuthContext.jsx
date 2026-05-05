import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data);
    toast.success('تم تسجيل الدخول');
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    saveSession(data);
    toast.success('تم إنشاء الحساب');
  };

  const googleLogin = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    saveSession(data);
    toast.success('تم تسجيل الدخول بواسطة Google');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    toast.success('تم تسجيل الخروج');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/profile').catch(() => logout());
  }, []);

  return <AuthContext.Provider value={{ user, login, register, googleLogin, logout }}>
    {children}
  </AuthContext.Provider>;
}
