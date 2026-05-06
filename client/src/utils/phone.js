export const normalizePhone = (value = '') => {
  const cleaned = String(value).trim().replace(/[\s()-]/g, '');
  if (!cleaned) return '';

  if (/^01\d{9}$/.test(cleaned)) {
    return `+2${cleaned}`;
  }

  if (/^20(1[0-2,5]\d{8})$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^00\d{8,15}$/.test(cleaned)) {
    return `+${cleaned.slice(2)}`;
  }

  if (/^\+\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }

  return '';
};

export const isPhoneFormatValid = (value = '') => Boolean(normalizePhone(value));

export const phoneFormatHelpText = 'اكتب رقمًا مصريًا مثل 01012345678 أو رقمًا دوليًا مثل +201012345678';
