import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

const googleClient = new OAuth2Client();

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions || [],
  avatar: user.avatar || '',
  walletBalance: Number(user.walletBalance || 0),
  hasManualPassword: Boolean(user.hasManualPassword)
});

const buildAuthResponse = (user) => ({
  token: generateToken(user._id),
  user: serializeUser(user)
});

const randomPassword = () => crypto.randomBytes(24).toString('hex');

const normalizePhone = (phone = '') => {
  const cleaned = String(phone).trim().replace(/[\s()-]/g, '');
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

const invalidPhoneMessage = 'اكتب رقمًا مصريًا صحيحًا مثل 01012345678 أو رقمًا دوليًا مثل +201012345678';

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || ''
});

const ensureTwilioVerifyEnabled = () => {
  const { accountSid, authToken, verifyServiceSid } = getTwilioConfig();
  if (!accountSid || !authToken || !verifyServiceSid) {
    const error = new Error('مصادقة رقم الهاتف غير مفعلة من إعدادات البيئة');
    error.statusCode = 400;
    throw error;
  }
  return { accountSid, authToken, verifyServiceSid };
};

const twilioVerifyRequest = async (path, payload) => {
  const { accountSid, authToken, verifyServiceSid } = ensureTwilioVerifyEnabled();
  const body = new URLSearchParams(payload);
  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'تعذر إرسال أو التحقق من رمز الهاتف');
    error.statusCode = response.status;
    throw error;
  }

  return data;
};

const createPhoneVerificationToken = (phone) => jwt.sign(
  { phone, purpose: 'phone_verification' },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const validatePhoneVerificationToken = (token, phone) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded?.purpose === 'phone_verification' && decoded.phone === phone;
};

export const sendPhoneVerification = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({ message: invalidPhoneMessage });
  }

  const verification = await twilioVerifyRequest('/Verifications', {
    To: phone,
    Channel: 'sms'
  });

  res.json({
    success: true,
    status: verification.status,
    phone,
    message: 'تم إرسال رمز التحقق إلى رقم الهاتف'
  });
});

export const checkPhoneVerification = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();

  if (!phone) {
    return res.status(400).json({ message: invalidPhoneMessage });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'رمز التحقق يجب أن يكون 6 أرقام' });
  }

  const verificationCheck = await twilioVerifyRequest('/VerificationCheck', {
    To: phone,
    Code: code
  });

  if (verificationCheck.status !== 'approved') {
    return res.status(400).json({ message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });
  }

  res.json({
    success: true,
    verified: true,
    phone,
    phoneVerificationToken: createPhoneVerificationToken(phone)
  });
});

export const loginWithPhoneCode = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const phoneVerificationToken = req.body.phoneVerificationToken;

  if (!phone) {
    return res.status(400).json({ message: invalidPhoneMessage });
  }

  if (!phoneVerificationToken) {
    return res.status(400).json({ message: 'يجب تأكيد رقم الهاتف أولًا' });
  }

  try {
    if (!validatePhoneVerificationToken(phoneVerificationToken, phone)) {
      return res.status(400).json({ message: 'تعذر التحقق من تأكيد رقم الهاتف' });
    }
  } catch {
    return res.status(400).json({ message: 'انتهت صلاحية تأكيد رقم الهاتف، أعد المحاولة' });
  }

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({ message: 'لا يوجد حساب مرتبط بهذا الرقم' });
  }

  res.json(buildAuthResponse(user));
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phoneVerificationToken } = req.body;
  const phone = normalizePhone(req.body.phone);
  const exists = await User.findOne({ email });

  if (!phone) {
    return res.status(400).json({ message: invalidPhoneMessage });
  }

  if (!phoneVerificationToken) {
    return res.status(400).json({ message: 'يجب تأكيد رقم الهاتف أولًا' });
  }

  try {
    if (!validatePhoneVerificationToken(phoneVerificationToken, phone)) {
      return res.status(400).json({ message: 'تعذر التحقق من تأكيد رقم الهاتف' });
    }
  } catch {
    return res.status(400).json({ message: 'انتهت صلاحية تأكيد رقم الهاتف، أعد المحاولة' });
  }

  const phoneOwner = await User.findOne({ phone });
  if (phoneOwner && String(phoneOwner.email) !== String(email)) {
    return res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل' });
  }

  if (exists) {
    if (exists.googleId && !exists.hasManualPassword) {
      exists.name = name || exists.name;
      exists.password = password;
      exists.phone = phone;
      exists.hasManualPassword = true;
      await exists.save();
      return res.status(200).json(buildAuthResponse(exists));
    }

    return res.status(400).json({ message: 'البريد مستخدم من قبل' });
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    hasManualPassword: true
  });

  res.status(201).json(buildAuthResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && await user.matchPassword(password)) {
    return res.json(buildAuthResponse(user));
  }

  if (user?.googleId && !user.hasManualPassword) {
    return res.status(401).json({
      message: 'هذا الحساب مسجل عبر Google فقط. استخدم Google أو أنشئ كلمة مرور بنفس البريد لربط الحساب.'
    });
  }

  res.status(401).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'بيانات Google غير موجودة' });
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return res.status(400).json({ message: 'تسجيل الدخول بجوجل غير مفعل من إعدادات البيئة' });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    return res.status(400).json({ message: 'تعذر التحقق من حساب Google' });
  }

  let user = await User.findOne({
    $or: [
      { email: payload.email },
      { googleId: payload.sub }
    ]
  });

  if (!user) {
    user = await User.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      password: randomPassword(),
      hasManualPassword: false,
      phone: '',
      googleId: payload.sub,
      avatar: payload.picture || ''
    });
  } else {
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    if (!user.name && payload.name) user.name = payload.name;
    await user.save();
  }

  res.json(buildAuthResponse(user));
});

export const setManualPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || String(password).trim().length < 6) {
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  req.user.password = password;
  req.user.hasManualPassword = true;
  await req.user.save();

  res.json(buildAuthResponse(req.user));
});

export const resetPasswordWithPhone = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const phoneVerificationToken = req.body.phoneVerificationToken;
  const password = req.body.password;

  if (!phone) {
    return res.status(400).json({ message: invalidPhoneMessage });
  }

  if (!phoneVerificationToken) {
    return res.status(400).json({ message: 'يجب تأكيد رقم الهاتف أولًا' });
  }

  if (!password || String(password).trim().length < 6) {
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  try {
    if (!validatePhoneVerificationToken(phoneVerificationToken, phone)) {
      return res.status(400).json({ message: 'تعذر التحقق من تأكيد رقم الهاتف' });
    }
  } catch {
    return res.status(400).json({ message: 'انتهت صلاحية تأكيد رقم الهاتف، أعد المحاولة' });
  }

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({ message: 'لا يوجد حساب مرتبط بهذا الرقم' });
  }

  user.password = password;
  user.hasManualPassword = true;
  await user.save();

  res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
});

export const profile = asyncHandler(async (req, res) => res.json(serializeUser(req.user)));
