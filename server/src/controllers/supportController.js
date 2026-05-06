import asyncHandler from 'express-async-handler';
import SupportConversation from '../models/SupportConversation.js';
import User from '../models/User.js';

const supportPopulate = [
  { path: 'customer', select: 'name email avatar' },
  { path: 'assignedEmployee', select: 'name email avatar' },
  { path: 'messages.sender', select: 'name email avatar role' }
];

const findSupportAgent = async () => {
  const employee = await User.findOne({
    role: 'employee',
    permissions: 'manage_support'
  }).sort({ createdAt: 1 });

  if (employee) return employee;
  return User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
};

const populateConversation = async (conversation) => conversation.populate(supportPopulate);

export const getMySupportConversation = asyncHandler(async (req, res) => {
  const conversation = await SupportConversation.findOne({ customer: req.user._id }).populate(supportPopulate);
  res.json(conversation || null);
});

export const sendMySupportMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'نص الرسالة مطلوب' });

  let conversation = await SupportConversation.findOne({ customer: req.user._id });
  if (!conversation) {
    const supportAgent = await findSupportAgent();
    conversation = await SupportConversation.create({
      customer: req.user._id,
      assignedEmployee: supportAgent?._id || null,
      messages: []
    });
  }

  conversation.status = 'open';
  conversation.messages.push({
    sender: req.user._id,
    senderRole: 'customer',
    text
  });
  conversation.supportUnreadCount += 1;
  conversation.customerLastReadAt = new Date();
  conversation.customerUnreadCount = 0;
  await conversation.save();

  await populateConversation(conversation);
  res.status(201).json(conversation);
});

export const markMySupportConversationRead = asyncHandler(async (req, res) => {
  const conversation = await SupportConversation.findOne({ customer: req.user._id });
  if (!conversation) return res.json({ success: true });

  conversation.customerUnreadCount = 0;
  conversation.customerLastReadAt = new Date();
  await conversation.save();

  res.json({ success: true });
});

export const setMySupportConversationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'حالة المحادثة غير صالحة' });
  }

  const conversation = await SupportConversation.findOne({ customer: req.user._id });
  if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });

  conversation.status = status;
  await conversation.save();
  await populateConversation(conversation);

  res.json(conversation);
});

export const listSupportConversations = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin'
    ? {}
    : { assignedEmployee: req.user._id };

  const conversations = await SupportConversation.find(query)
    .populate(supportPopulate)
    .sort({ updatedAt: -1 });

  res.json(conversations);
});

export const replySupportConversation = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'نص الرسالة مطلوب' });

  const conversation = await SupportConversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });

  const canAccess = req.user.role === 'admin' || conversation.assignedEmployee?.toString() === req.user._id.toString();
  if (!canAccess) {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  if (!conversation.assignedEmployee && req.user.role === 'employee') {
    conversation.assignedEmployee = req.user._id;
  }

  conversation.status = 'open';
  conversation.messages.push({
    sender: req.user._id,
    senderRole: 'support',
    text
  });
  conversation.customerUnreadCount += 1;
  conversation.supportLastReadAt = new Date();
  conversation.supportUnreadCount = 0;
  await conversation.save();

  await populateConversation(conversation);
  res.json(conversation);
});

export const markSupportConversationRead = asyncHandler(async (req, res) => {
  const conversation = await SupportConversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });

  const canAccess = req.user.role === 'admin' || conversation.assignedEmployee?.toString() === req.user._id.toString();
  if (!canAccess) {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  conversation.supportUnreadCount = 0;
  conversation.supportLastReadAt = new Date();
  await conversation.save();

  res.json({ success: true });
});

export const setSupportConversationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'حالة المحادثة غير صالحة' });
  }

  const conversation = await SupportConversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });

  const canAccess = req.user.role === 'admin' || conversation.assignedEmployee?.toString() === req.user._id.toString();
  if (!canAccess) {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  if (!conversation.assignedEmployee && req.user.role === 'employee') {
    conversation.assignedEmployee = req.user._id;
  }

  conversation.status = status;
  await conversation.save();
  await populateConversation(conversation);

  res.json(conversation);
});
