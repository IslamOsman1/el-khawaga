export const countryPhoneOptions = [
  { code: 'EG', dialCode: '+20', label: 'مصر' },
  { code: 'SA', dialCode: '+966', label: 'السعودية' },
  { code: 'AE', dialCode: '+971', label: 'الإمارات' },
  { code: 'KW', dialCode: '+965', label: 'الكويت' },
  { code: 'QA', dialCode: '+974', label: 'قطر' },
  { code: 'BH', dialCode: '+973', label: 'البحرين' },
  { code: 'OM', dialCode: '+968', label: 'عمان' },
  { code: 'JO', dialCode: '+962', label: 'الأردن' },
  { code: 'IQ', dialCode: '+964', label: 'العراق' },
  { code: 'US', dialCode: '+1', label: 'الولايات المتحدة' }
];

const defaultCountry = countryPhoneOptions[0];

const cleanPhoneDigits = (value = '') => String(value || '').replace(/[^\d]/g, '');

export const normalizePhone = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('+')) {
    const digits = `+${cleanPhoneDigits(raw)}`;
    return /^\+\d{8,15}$/.test(digits) ? digits : '';
  }

  if (raw.startsWith('00')) {
    const digits = `+${cleanPhoneDigits(raw).slice(2)}`;
    return /^\+\d{8,15}$/.test(digits) ? digits : '';
  }

  const digits = cleanPhoneDigits(raw);
  if (!digits) return '';

  if (/^01\d{9}$/.test(digits)) {
    return `+20${digits}`;
  }

  if (/^20\d{10,13}$/.test(digits)) {
    return `+${digits}`;
  }

  return /^\d{8,15}$/.test(digits) ? `+${digits}` : '';
};

export const isPhoneFormatValid = (value = '') => Boolean(normalizePhone(value));

export const composePhoneNumber = (dialCode = defaultCountry.dialCode, localNumber = '') => {
  const normalizedDialCode = String(dialCode || defaultCountry.dialCode).trim();
  const digits = cleanPhoneDigits(localNumber);
  if (!digits) return '';

  const sanitizedLocal = normalizedDialCode === '+20' ? digits.replace(/^0+/, '') : digits;
  return normalizePhone(`${normalizedDialCode}${sanitizedLocal}`);
};

export const splitPhoneNumber = (value = '') => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return {
      countryCode: defaultCountry.dialCode,
      localNumber: ''
    };
  }

  const matchedCountry = [...countryPhoneOptions]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((option) => normalized.startsWith(option.dialCode));

  if (!matchedCountry) {
    return {
      countryCode: defaultCountry.dialCode,
      localNumber: normalized.replace(/^\+/, '')
    };
  }

  let localNumber = normalized.slice(matchedCountry.dialCode.length);
  if (matchedCountry.dialCode === '+20' && localNumber && !localNumber.startsWith('0')) {
    localNumber = `0${localNumber}`;
  }

  return {
    countryCode: matchedCountry.dialCode,
    localNumber
  };
};

export const phoneFormatHelpText = 'اختر رمز الدولة ثم اكتب رقم الهاتف بدون مسافات.';
