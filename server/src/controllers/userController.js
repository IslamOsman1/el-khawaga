import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import { buildCustomerQrValue, ensureCustomerCode } from '../utils/customerIdentity.js';
import { getPushPublicKey, isPushConfigured, normalizePushSubscription } from '../utils/pushNotifications.js';
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

const normalizeCode = (value = '') => String(value || '').trim().toUpperCase();
const buildRegex = (value = '') => new RegExp(String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const isDiscountCodeActive = (code) => {
  if (!code || code.active === false) return false;
  if (!code.expiresAt) return true;
  return new Date(code.expiresAt).getTime() >= Date.now();
};

const serializeDiscountCode = (code) => ({
  _id: code._id,
  code: code.code || '',
  type: code.type || 'fixed',
  value: Number(code.value || 0),
  minOrderAmount: Number(code.minOrderAmount || 0),
  maxDiscount: Number(code.maxDiscount || 0),
  usageLimit: Number(code.usageLimit || 0),
  usedCount: Number(code.usedCount || 0),
  active: code.active !== false,
  expiresAt: code.expiresAt || null,
  note: code.note || '',
  createdAt: code.createdAt || null
});

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  customerCode: user.customerCode || '',
  qrCodeValue: buildCustomerQrValue(user),
  addresses: Array.isArray(user.addresses)
    ? user.addresses.map((item) => ({
      _id: item._id,
      label: item.label || '',
      governorate: item.governorate || '',
      city: item.city || '',
      street: item.street || '',
      notes: item.notes || '',
      address: item.address || item.street || ''
    }))
    : [],
  role: user.role,
  permissions: user.permissions || [],
  avatar: user.avatar || '',
  walletBalance: Number(user.walletBalance || 0),
  loyaltyPoints: Number(user.loyaltyPoints || 0),
  loyaltyHistory: Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [],
  inStoreSpentTotal: Number(user.inStoreSpentTotal || 0),
  privateDiscountCodes: Array.isArray(user.privateDiscountCodes)
    ? user.privateDiscountCodes.filter(isDiscountCodeActive).map(serializeDiscountCode)
    : [],
  hasManualPassword: Boolean(user.hasManualPassword)
});

const serializeCustomerCareUser = (user) => ({
  _id: user._id,
  name: user.name || '',
  email: user.email || '',
  phone: user.phone || '',
  avatar: user.avatar || '',
  role: user.role || 'user',
  customerCode: user.customerCode || '',
  qrCodeValue: buildCustomerQrValue(user),
  walletBalance: Number(user.walletBalance || 0),
  loyaltyPoints: Number(user.loyaltyPoints || 0),
  inStoreSpentTotal: Number(user.inStoreSpentTotal || 0),
  privateDiscountCodes: Array.isArray(user.privateDiscountCodes)
    ? user.privateDiscountCodes.filter(isDiscountCodeActive).map(serializeDiscountCode)
    : [],
  customerCareHistory: Array.isArray(user.customerCareHistory)
    ? user.customerCareHistory.slice(0, 12)
    : []
});

const buildPrivateDiscountCode = (customerCode = '') => {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const readableCustomer = String(customerCode || 'WK').slice(-4).toUpperCase();
  return `VIP-${readableCustomer}-${suffix}`;
};

const ensureUsersHaveCodes = async (users = []) => {
  await Promise.all(users.map((user) => ensureCustomerCode(user)));
  return users;
};

const employeeHasAnyPermission = (reqUser, permissions = []) => (
  reqUser?.role === 'admin'
  || (reqUser?.role === 'employee' && permissions.some((permission) => reqUser.permissions?.includes(permission)))
);

export const allUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({})
    .select('name email phone role permissions avatar walletBalance loyaltyPoints hasManualPassword createdAt googleId addresses customerCode privateDiscountCodes inStoreSpentTotal customerCareHistory')
    .sort({ createdAt: -1 });

  await ensureUsersHaveCodes(users);
  res.json(users);
});

export const searchCustomerCareUsers = asyncHandler(async (req, res) => {
  const rawQuery = String(req.query.q || '').trim();
  const query = rawQuery.includes(':') ? rawQuery.split(':').pop().trim() : rawQuery;

  const mongoQuery = query
    ? {
      $or: [
        { customerCode: buildRegex(query) },
        { phone: buildRegex(query) },
        { name: buildRegex(query) },
        { email: buildRegex(query) }
      ]
    }
    : {};

  const users = await User.find(mongoQuery)
    .select('name email phone avatar role walletBalance loyaltyPoints customerCode privateDiscountCodes customerCareHistory inStoreSpentTotal')
    .sort({ createdAt: -1 })
    .limit(query ? 30 : 40);

  await ensureUsersHaveCodes(users);
  res.json(users.map(serializeCustomerCareUser));
});

export const applyCustomerCareAction = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  await ensureCustomerCode(user);

  const actionType = String(req.body.actionType || '').trim();
  const note = String(req.body.note || '').trim();

  if (!['wallet_credit', 'points_credit', 'discount_code', 'store_purchase'].includes(actionType)) {
    return res.status(400).json({ message: 'نوع العملية غير صالح' });
  }

  if (
    ['wallet_credit', 'points_credit', 'discount_code'].includes(actionType)
    && !employeeHasAnyPermission(req.user, ['manage_customers', 'manage_customer_care', 'manage_loyalty'])
  ) {
    return res.status(403).json({ message: 'ØºÙŠØ± Ù…ØµØ±Ø­ Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©' });
  }

  if (
    actionType === 'store_purchase'
    && !employeeHasAnyPermission(req.user, ['manage_customers', 'manage_store_purchases'])
  ) {
    return res.status(403).json({ message: 'ØºÙŠØ± Ù…ØµØ±Ø­ Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©' });
  }

  if (actionType === 'wallet_credit') {
    const amount = Math.max(0, Number(req.body.amount || 0));
    if (!amount) {
      return res.status(400).json({ message: 'أدخل مبلغًا صحيحًا للمحفظة' });
    }

    user.walletBalance = Number(user.walletBalance || 0) + amount;
    user.customerCareHistory = [
      {
        type: 'wallet_credit',
        amount,
        note: note || 'إضافة رصيد للمحفظة من قسم إرضاء العميل',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.customerCareHistory) ? user.customerCareHistory : [])
    ].slice(0, 40);
  }

  if (actionType === 'points_credit') {
    const points = Math.max(0, Number(req.body.points || req.body.amount || 0));
    if (!points) {
      return res.status(400).json({ message: 'أدخل عدد نقاط صحيح' });
    }

    user.loyaltyPoints = Number(user.loyaltyPoints || 0) + points;
    user.loyaltyHistory = [
      {
        amount: points,
        reason: note || 'إضافة نقاط من قسم إرضاء العميل',
        source: 'customer-care',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
    ].slice(0, 50);
    user.customerCareHistory = [
      {
        type: 'points_credit',
        points,
        note: note || 'إضافة نقاط يدوية',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.customerCareHistory) ? user.customerCareHistory : [])
    ].slice(0, 40);
  }

  if (actionType === 'discount_code') {
    const code = normalizeCode(req.body.code || buildPrivateDiscountCode(user.customerCode));
    const type = req.body.type === 'percent' ? 'percent' : 'fixed';
    const value = Math.max(0, Number(req.body.value || 0));
    const minOrderAmount = Math.max(0, Number(req.body.minOrderAmount || 0));
    const maxDiscount = Math.max(0, Number(req.body.maxDiscount || 0));
    const usageLimit = Math.max(1, Number(req.body.usageLimit || 1));
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!code || !value) {
      return res.status(400).json({ message: 'بيانات كود الخصم غير مكتملة' });
    }

    const duplicatedOnUser = (user.privateDiscountCodes || []).some((item) => normalizeCode(item.code) === code);
    const duplicatedOnAnotherUser = await User.exists({
      _id: { $ne: user._id },
      'privateDiscountCodes.code': code
    });

    if (duplicatedOnUser || duplicatedOnAnotherUser) {
      return res.status(400).json({ message: 'كود الخصم مستخدم بالفعل' });
    }

    user.privateDiscountCodes = [
      {
        code,
        type,
        value,
        minOrderAmount,
        maxDiscount,
        usageLimit,
        usedCount: 0,
        active: true,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
        note,
        createdBy: req.user._id
      },
      ...(Array.isArray(user.privateDiscountCodes) ? user.privateDiscountCodes : [])
    ].slice(0, 20);

    user.customerCareHistory = [
      {
        type: 'discount_code',
        code,
        amount: value,
        note: note || 'إضافة كود خصم خاص',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.customerCareHistory) ? user.customerCareHistory : [])
    ].slice(0, 40);
  }

  if (actionType === 'store_purchase') {
    const amount = Math.max(0, Number(req.body.amount || 0));
    const awardedPoints = Math.max(0, Math.floor(amount));

    if (!amount) {
      return res.status(400).json({ message: 'أدخل مبلغ شراء صحيح' });
    }

    user.inStoreSpentTotal = Number(user.inStoreSpentTotal || 0) + amount;
    user.loyaltyPoints = Number(user.loyaltyPoints || 0) + awardedPoints;
    user.loyaltyHistory = [
      {
        amount: awardedPoints,
        reason: note || 'نقاط من شراء داخل المحل',
        source: 'store-purchase',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
    ].slice(0, 50);
    user.customerCareHistory = [
      {
        type: 'store_purchase',
        amount,
        points: awardedPoints,
        note: note || 'تسجيل شراء من داخل المحل',
        createdBy: req.user._id
      },
      ...(Array.isArray(user.customerCareHistory) ? user.customerCareHistory : [])
    ].slice(0, 40);
  }

  await user.save();

  res.json({
    message: 'تم تنفيذ العملية بنجاح',
    user: serializeCustomerCareUser(user)
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { role, permissions } = req.body;
  const allowedRoles = ['admin', 'user', 'employee'];
  const allowedPermissions = [
    'manage_products',
    'manage_orders',
    'manage_support',
    'manage_customers',
    'manage_customer_care',
    'manage_store_purchases',
    'manage_loyalty'
  ];

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
  await ensureCustomerCode(req.user);
  res.json(serializeUser(req.user));
});

export const getMyPushConfig = asyncHandler(async (_req, res) => {
  res.json({
    enabled: isPushConfigured(),
    publicKey: isPushConfigured() ? getPushPublicKey() : ''
  });
});

export const saveMyPushSubscription = asyncHandler(async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ message: 'Push notifications are not configured yet' });
  }

  const subscription = normalizePushSubscription(req.body.subscription);
  if (!subscription) {
    return res.status(400).json({ message: 'بيانات اشتراك الإشعارات غير صالحة' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  const userAgent = String(req.body.userAgent || '').trim().slice(0, 500);

  await User.updateMany(
    { _id: { $ne: user._id }, 'pushSubscriptions.endpoint': subscription.endpoint },
    { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
  );

  const subscriptions = Array.isArray(user.pushSubscriptions) ? [...user.pushSubscriptions] : [];
  const existingIndex = subscriptions.findIndex((entry) => entry.endpoint === subscription.endpoint);
  const nextEntry = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: subscription.keys,
    userAgent,
    createdAt: existingIndex >= 0 ? subscriptions[existingIndex].createdAt || new Date() : new Date(),
    updatedAt: new Date()
  };

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = nextEntry;
  } else {
    subscriptions.unshift(nextEntry);
  }

  user.pushSubscriptions = subscriptions.slice(0, 8);
  await user.save();

  res.json({ success: true });
});

export const removeMyPushSubscription = asyncHandler(async (req, res) => {
  const endpoint = String(req.body.endpoint || '').trim();
  if (!endpoint) {
    return res.status(400).json({ message: 'رابط الاشتراك مطلوب' });
  }

  await User.updateOne(
    { _id: req.user._id },
    { $pull: { pushSubscriptions: { endpoint } } }
  );

  res.json({ success: true });
});

export const updateMySettings = asyncHandler(async (req, res) => {
  const { name, email, phone, password, addresses } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  await ensureCustomerCode(user);

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
      .filter((item) => item && (item.label || item.address || item.street))
      .map((item) => ({
        label: String(item.label || '').trim(),
        governorate: String(item.governorate || '').trim(),
        city: String(item.city || '').trim(),
        street: String(item.street || item.address || '').trim(),
        notes: String(item.notes || '').trim(),
        address: String(item.address || item.street || '').trim()
      }))
      .filter((item) => item.street || item.address);
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

  await ensureCustomerCode(user);

  const result = await uploadToCloudinary(req.file.buffer, 'alwekala/avatars');
  user.avatar = result.secure_url;
  await user.save();

  res.json({
    message: 'تم تحديث صورة الملف الشخصي',
    user: serializeUser(user)
  });
});
