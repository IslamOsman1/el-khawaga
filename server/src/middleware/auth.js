import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح، سجل الدخول أولًا' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'المستخدم غير موجود' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'انتهت الجلسة أو التوكن غير صحيح' });
  }
});

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'هذه الصفحة للأدمن فقط' });
};

export const hasPermission = (permission) => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  if (req.user?.role === 'employee' && req.user.permissions?.includes(permission)) return next();
  res.status(403).json({ message: 'غير مصرح بهذه العملية' });
};
