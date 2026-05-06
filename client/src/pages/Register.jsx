import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import SocialLoginButtons from '../components/SocialLoginButtons.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useOtpCooldown from '../hooks/useOtpCooldown.js';
import { normalizePhone, phoneFormatHelpText } from '../utils/phone.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { timeLeft, isCoolingDown, startCooldown, resetCooldown } = useOtpCooldown();

  const normalizedPhone = useMemo(() => normalizePhone(form.phone), [form.phone]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (name === 'phone') {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setPhoneVerificationToken('');
      resetCooldown();
    }
  };

  const sendCode = async () => {
    if (!normalizedPhone) {
      toast.error(phoneFormatHelpText);
      return;
    }

    try {
      setSendingCode(true);
      await api.post('/auth/phone/send-code', { phone: normalizedPhone });
      setOtpSent(true);
      setOtpVerified(false);
      setPhoneVerificationToken('');
      startCooldown(60);
      toast.success('تم إرسال رمز التحقق');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إرسال رمز التحقق');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!otpCode.trim()) {
      toast.error('أدخل رمز التحقق');
      return;
    }

    try {
      setCheckingCode(true);
      const { data } = await api.post('/auth/phone/verify-code', {
        phone: normalizedPhone,
        code: otpCode
      });
      setOtpVerified(true);
      setPhoneVerificationToken(data.phoneVerificationToken || '');
      toast.success('تم تأكيد رقم الهاتف');
    } catch (error) {
      toast.error(error.response?.data?.message || 'رمز التحقق غير صحيح');
    } finally {
      setCheckingCode(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!normalizedPhone) {
      toast.error(phoneFormatHelpText);
      return;
    }

    if (!otpVerified || !phoneVerificationToken) {
      toast.error('يجب تأكيد رقم الهاتف أولًا');
      return;
    }

    try {
      await register({ ...form, phone: normalizedPhone, phoneVerificationToken });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إنشاء الحساب');
    }
  };

  return <div className="auth-card auth-extended-card">
    <h1>إنشاء حساب</h1>
    <form onSubmit={submit}>
      <input name="name" type="text" placeholder="الاسم" value={form.name} onChange={change} />
      <input name="email" type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={change} />

      <div className="otp-inline-row">
        <input
          name="phone"
          type="text"
          placeholder="رقم الهاتف"
          value={form.phone}
          onChange={change}
        />
        <button type="button" className="secondary-btn otp-action-btn" onClick={sendCode} disabled={sendingCode || isCoolingDown}>
          {sendingCode ? 'جارٍ الإرسال...' : isCoolingDown ? `إعادة الإرسال خلال ${timeLeft}s` : otpSent ? 'إعادة الإرسال' : 'إرسال الكود'}
        </button>
      </div>
      <p className="field-hint">{phoneFormatHelpText}</p>

      {otpSent && <div className="otp-inline-row">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="رمز التحقق المكون من 6 أرقام"
          value={otpCode}
          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button type="button" className="secondary-btn otp-action-btn" onClick={verifyCode} disabled={checkingCode || otpVerified}>
          {otpVerified ? 'تم التأكيد' : checkingCode ? 'جارٍ التحقق...' : 'تأكيد الكود'}
        </button>
      </div>}

      <div className="otp-status-row">
        <span className={`otp-status-chip${otpVerified ? ' verified' : ''}`}>
          {otpVerified ? 'تم تأكيد رقم الهاتف' : 'يجب تأكيد رقم الهاتف قبل التسجيل'}
        </span>
      </div>

      <PasswordField
        name="password"
        value={form.password}
        onChange={change}
        placeholder="كلمة المرور"
        autoComplete="new-password"
      />
      <button className="primary-btn">تسجيل</button>
    </form>

    <div className="auth-divider"><span>أو</span></div>
    <SocialLoginButtons />

    <p>لديك حساب بالفعل؟ <Link to="/login">سجل الدخول</Link></p>
  </div>;
}
