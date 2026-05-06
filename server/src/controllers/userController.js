import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const allUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({})
    .select('name email phone role permissions avatar walletBalance hasManualPassword createdAt googleId')
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
