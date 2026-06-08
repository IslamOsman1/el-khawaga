import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function CompletePasswordPage() {
  const { user, setManualPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (password.trim().length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق');
      return;
    }

    try {
      setSaving(true);
      await setManualPassword(password);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حفظ كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  return <main className="app-shell home-screen market-home">
    <section className="auth-card auth-extended-card password-setup-card">
      <h1>أكمل تأمين الحساب</h1>
      <p className="muted">تم تسجيل دخولك بواسطة Google. يجب إنشاء كلمة مرور قبل متابعة استخدام الموقع.</p>

      <div className="password-setup-user">
        <strong>{user?.name || 'مستخدم الموقع'}</strong>
        <span>{user?.email || ''}</span>
      </div>

      <form onSubmit={submit}>
        <PasswordField
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة المرور الجديدة"
          autoComplete="new-password"
        />
        <PasswordField
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="تأكيد كلمة المرور"
          autoComplete="new-password"
        />
        <button className="primary-btn" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}</button>
      </form>

      <button type="button" className="secondary-btn password-setup-logout" onClick={() => {
        logout();
        navigate('/login', { replace: true });
      }}>
        تسجيل الخروج
      </button>
    </section>
  </main>;
}
