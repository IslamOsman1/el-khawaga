import React from 'react';
import { countryPhoneOptions } from '../utils/phone.js';

export default function PhoneInputField({
  countryCode,
  localNumber,
  onCountryCodeChange,
  onLocalNumberChange,
  label = '',
  placeholder = 'رقم الهاتف',
  required = false
}) {
  const field = (
    <div className="phone-input-field">
      <select value={countryCode} onChange={(event) => onCountryCodeChange(event.target.value)} aria-label={label || 'رمز الدولة'}>
        {countryPhoneOptions.map((option) => (
          <option key={option.code} value={option.dialCode}>
            {option.label} {option.dialCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        value={localNumber}
        onChange={(event) => onLocalNumberChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  if (!label) return field;

  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {field}
    </label>
  );
}
