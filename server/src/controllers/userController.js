import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

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

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  addresses: Array.isArray(user.addresses) ? user.addresses : [],
  role: user.role,
  permissions: user.permissions || [],
  avatar: user.avatar || '',
  walletBalance: Number(user.walletBalance || 0),
  hasManualPassword: Boolean(user.hasManualPassword)
});

export const allUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({})
    .select('name email phone role permissions avatar walletBalance hasManualPassword createdAt googleId addresses')
    .sort({ createdAt: -1 });

  res.json(users);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { role, permissions } = req.body;
  const allowedRoles = ['admin', 'user', 'employee'];
  const allowedPermissions = ['manage_products', 'manage_orders', 'manage_support'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'نوع الحساب غير صالح' });
  }

  if (permissions && (!Array.isArray(permissions) || permissions.some((item) => !allowedPermissions.includes(item)))) {
    return res.status(400).json({ message: 'الصلاحيات غير صالحة' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  user.role = role;
  user.permissions = role === 'employee'
    ? (permissions || user.permissions || [])
    : [];
  await user.save();

  res.json({
    message: 'تم تحديث نوع الحساب بنجاح',
    user: {
      _id: user._id,
      role: user.role,
      permissions: user.permissions
    }
  });
});

export const getMySettings = asyncHandler(async (req, res) => {
  res.json(serializeUser(req.user));
});

export const updateMySettings = asyncHandler(async (req, res) => {
  const { name, email, phone, password, addresses } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  if (typeof name === 'string' && name.trim()) {
    user.name = name.trim();
  }

  if (typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailOwner = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (emailOwner) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم من قبل' });
    }
    user.email = normalizedEmail;
  }

  if (typeof phone === 'string' && phone.trim()) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'رقم الهاتف غير صالح' });
    }

    const phoneOwner = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
    if (phoneOwner) {
      return res.status(400).json({ message: 'رقم الهاتف مستخدم من قبل' });
    }

    user.phone = normalizedPhone;
  }

  if (typeof password === 'string' && password.trim()) {
    if (password.trim().length < 6) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    user.password = password.trim();
    user.hasManualPassword = true;
  }

  if (Array.isArray(addresses)) {
    user.addresses = addresses
      .filter((item) => item && (item.label || item.address))
      .map((item) => ({
        label: String(item.label || '').trim(),
        address: String(item.address || '').trim()
      }))
      .filter((item) => item.address);
  }

  await user.save();
  res.json({
    message: 'تم تحديث إعدادات الملف الشخصي',
    user: serializeUser(user)
  });
});

export const uploadMyAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'اختر صورة أولًا' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  const result = await uploadToCloudinary(req.file.buffer, 'alwekala/avatars');
  user.avatar = result.secure_url;
  await user.save();

  res.json({
    message: 'تم تحديث صورة الملف الشخصي',
    user: serializeUser(user)
  });
});
