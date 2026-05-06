import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ value, onChange, placeholder, name, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);

  return <div className="password-field">
    <input
      name={name}
      type={visible ? 'text' : 'password'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
    />
    <button
      type="button"
      className="password-toggle"
      onClick={() => setVisible((current) => !current)}
      aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
      title={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>;
}
