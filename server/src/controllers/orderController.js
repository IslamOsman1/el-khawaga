import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ensureStoreSettings } from '../utils/storeSettings.js';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

const calculateShippingPrice = async (itemsPrice) => {
  const settings = await ensureStoreSettings();
  const shippingFee = Number(settings.checkout?.shippingFee ?? 35);
  const freeShippingThreshold = Number(settings.checkout?.freeShippingThreshold ?? 500);

  if (!itemsPrice || itemsPrice >= freeShippingThreshold) return 0;
  return shippingFee;
};

const buildOrderItems = async (orderItems) => {
  const ids = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } });

  return orderItems.map((item) => {
    const product = products.find((entry) => entry._id.toString() === item.product);
    if (!product) throw new Error('منتج غير موجود');
    if (product.countInStock < item.qty) throw new Error(`الكمية غير متاحة: ${product.name}`);

    return {
      product: product._id,
      name: product.name,
      qty: item.qty,
      image: product.image?.url,
      price: product.price
    };
  });
};

const canUserCancelOrder = (order) => {
  if (!order) return false;
  if (order.status !== 'جديد') return false;
  return Date.now() - new Date(order.createdAt).getTime() <= CANCEL_WINDOW_MS;
};

export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;
  if (!orderItems?.length) return res.status(400).json({ message: 'السلة فارغة' });

  const settings = await ensureStoreSettings();
  const paymentSettings = settings.payment || {};

  if (paymentMethod === 'online' && !paymentSettings.onlinePaymentEnabled) {
    return res.status(400).json({ message: 'الدفع الأونلاين غير متاح حاليًا' });
  }

  if (paymentMethod === 'cod' && !paymentSettings.cashOnDeliveryEnabled) {
    return res.status(400).json({ message: 'الدفع عند الاستلام غير متاح حاليًا' });
  }

  const items = await buildOrderItems(orderItems);
  const itemsPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingPrice = await calculateShippingPrice(itemsPrice);

  const order = await Order.create({
    user: req.user._id,
    orderItems: items,
    shippingAddress,
    paymentMethod: paymentMethod === 'online' ? 'دفع أونلاين' : 'الدفع عند الاستلام',
    paymentProvider: paymentMethod === 'online' ? (paymentSettings.onlineProvider || 'stripe') : '',
    itemsPrice,
    shippingPrice,
    totalPrice: itemsPrice + shippingPrice
  });

  for (const item of items) {
    await Product.updateOne({ _id: item.product }, { $inc: { countInStock: -item.qty } });
  }

  res.status(201).json(order);
});

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone walletBalance');
  if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

  const isOwner = order.user?._id?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  res.json(order);
});

export const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email phone walletBalance').sort({ createdAt: -1 });
  res.json(orders);
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

  const isOwner = order.user?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  if (!canUserCancelOrder(order)) {
    return res.status(400).json({ message: 'يمكن إلغاء الطلب خلال أول 5 دقائق فقط ما دام ما زال جديدًا' });
  }

  order.status = 'ملغي';

  for (const item of order.orderItems) {
    await Product.updateOne({ _id: item.product }, { $inc: { countInStock: item.qty } });
  }

  const isOnlinePayment = order.paymentMethod === 'دفع أونلاين' || order.paymentProvider === 'stripe';

  if (order.isPaid && isOnlinePayment && !order.refundedToWallet) {
    const user = await User.findById(order.user);
    if (user) {
      user.walletBalance = Number(user.walletBalance || 0) + Number(order.totalPrice || 0);
      await user.save();
    }

    order.refundedToWallet = true;
    order.refundedAmount = Number(order.totalPrice || 0);
    order.refundedAt = new Date();
  }

  await order.save();

  res.json({
    message: order.refundedToWallet
      ? 'تم إلغاء الطلب وإضافة المبلغ إلى المحفظة'
      : 'تم إلغاء الطلب بنجاح',
    order
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

  order.status = req.body.status || order.status;
  if (req.body.isPaid === true) {
    order.isPaid = true;
    order.paidAt = order.paidAt || new Date();
  }
  if (order.status === 'تم التسليم') {
    order.deliveredAt = new Date();
  }

  await order.save();
  res.json(order);
});
