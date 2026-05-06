import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
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
  walletBalance: Number(user.walletBalance || 0)
});

const buildAuthResponse = (user) => ({
  token: generateToken(user._id),
  user: serializeUser(user)
});

const randomPassword = () => crypto.randomBytes(24).toString('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const exists = await User.findOne({ email });

  if (exists) {
    if (exists.googleId && !exists.hasManualPassword) {
      exists.name = name || exists.name;
      exists.password = password;
      exists.phone = phone || exists.phone;
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

export const profile = asyncHandler(async (req, res) => res.json(serializeUser(req.user)));
