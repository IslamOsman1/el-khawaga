import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SocialLoginButtons from '../components/SocialLoginButtons.jsx';
import PasswordField from '../components/PasswordField.jsx';
import PhoneInputField from '../components/PhoneInputField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { composePhoneNumber, phoneFormatHelpText } from '../utils/phone.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [countryCode, setCountryCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      await register({
        ...form,
        phone: composePhoneNumber(countryCode, localPhone)
      });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إنشاء الحساب');
    }
  };

  return (
    <div className="auth-card auth-extended-card">
      <h1>إنشاء حساب</h1>

      <form onSubmit={submit}>
        <input name="name" type="text" placeholder="الاسم" value={form.name} onChange={change} />
        <input name="email" type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={change} />
        <PhoneInputField
          countryCode={countryCode}
          localNumber={localPhone}
          onCountryCodeChange={setCountryCode}
          onLocalNumberChange={setLocalPhone}
          placeholder="رقم الهاتف"
        />
        <small className="muted">{phoneFormatHelpText}</small>
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
      <p className="auth-policy-links">
        بإنشائك للحساب فأنت توافق على <Link to="/policies/terms">الشروط والأحكام</Link> و<Link to="/policies/privacy">سياسة الخصوصية</Link>
      </p>
    </div>
  );
}
