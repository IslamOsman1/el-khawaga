import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const allUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({})
    .select('name email phone role avatar walletBalance hasManualPassword createdAt googleId')
    .sort({ createdAt: -1 });

  res.json(users);
});
