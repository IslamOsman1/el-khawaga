import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/pushNotifications.js';
import { ensureStoreSettings } from '../utils/storeSettings.js';
import { calculateEarnedLoyaltyPoints, calculateOrderPricing, incrementDiscountCodeUsage } from '../utils/pricing.js';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

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

const restoreUsedLoyaltyPoints = async (order) => {
  if (!Number(order?.loyaltyPointsUsed || 0)) return;

  const user = await User.findById(order.user);
  if (!user) return;

  user.loyaltyPoints = Number(user.loyaltyPoints || 0) + Number(order.loyaltyPointsUsed || 0);
  user.loyaltyHistory = [
    {
      amount: Number(order.loyaltyPointsUsed || 0),
      reason: 'استرجاع نقاط من طلب ملغي',
      order: order._id
    },
    ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
  ].slice(0, 30);
  await user.save();
};

const consumeLoyaltyPoints = async (userId, order, usedPoints) => {
  if (!Number(usedPoints || 0)) return;

  const user = await User.findById(userId);
  if (!user) return;

  user.loyaltyPoints = Math.max(0, Number(user.loyaltyPoints || 0) - Number(usedPoints || 0));
  user.loyaltyHistory = [
    {
      amount: -Number(usedPoints || 0),
      reason: 'استخدام نقاط في طلب جديد',
      order: order._id
    },
    ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
  ].slice(0, 30);
  await user.save();
};

const awardLoyaltyPointsIfEligible = async (order) => {
  if (!order || order.status !== 'تم التسليم' || order.loyaltyPointsAwarded) return;

  const settings = await ensureStoreSettings();
  const points = calculateEarnedLoyaltyPoints(settings, order?.itemsPrice || 0);
  order.loyaltyPointsAwarded = true;
  order.loyaltyPointsAmount = points;

  if (!points) return;

  const user = await User.findById(order.user);
  if (!user) return;

  user.loyaltyPoints = Number(user.loyaltyPoints || 0) + points;
  user.loyaltyHistory = [
    {
      amount: points,
      reason: 'نقاط من طلب مكتمل',
      order: order._id
    },
    ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
  ].slice(0, 30);
  await user.save();
};

const notifyOrderManagers = async (order, customer) => {
  const managers = await User.find({
    $or: [
      { role: 'admin' },
      { role: 'employee', permissions: 'manage_orders' }
    ]
  }).select('pushSubscriptions');

  await sendPushToUsers(managers, {
    title: 'طلب جديد في المتجر',
    body: `وصلك طلب جديد من ${customer?.name || 'عميل جديد'}`,
    url: '/admin?section=orders',
    tag: `order-created-${order._id}`,
    data: {
      orderId: String(order._id),
      type: 'order-created'
    }
  });
};

const notifyOrderCustomer = async (order, body) => {
  const customer = await User.findById(order.user).select('pushSubscriptions');
  if (!customer) return;

  await sendPushToUsers([customer], {
    title: 'تحديث حالة الطلب',
    body,
    url: '/orders',
    tag: `order-status-${order._id}`,
    data: {
      orderId: String(order._id),
      type: 'order-status'
    }
  });
};

export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, discountCode, redeemLoyaltyPoints } = req.body;
  if (!orderItems?.length) {
    return res.status(400).json({ message: 'السلة فارغة' });
  }

  const settings = await ensureStoreSettings();
  const paymentSettings = settings.payment || {};

  if (paymentMethod === 'online' && !paymentSettings.onlinePaymentEnabled) {
    return res.status(400).json({ message: 'الدفع الأونلاين غير متاح حاليًا' });
  }

  if (paymentMethod === 'cod' && !paymentSettings.cashOnDeliveryEnabled) {
    return res.status(400).json({ message: 'الدفع عند الاستلام غير متاح حاليًا' });
  }

  const items = await buildOrderItems(orderItems);
  const pricing = await calculateOrderPricing({
    settings,
    items,
    shippingAddress,
    discountCode,
    redeemLoyaltyPoints,
    user: req.user
  });

  const order = await Order.create({
    user: req.user._id,
    orderItems: items,
    shippingAddress,
    paymentMethod: paymentMethod === 'online' ? 'دفع أونلاين' : 'الدفع عند الاستلام',
    paymentProvider: paymentMethod === 'online' ? (paymentSettings.onlineProvider || 'stripe') : '',
    itemsPrice: pricing.itemsPrice,
    shippingPrice: pricing.shippingPrice,
    discountCode: pricing.discountCode,
    discountCodeAmount: pricing.discountCodeAmount,
    loyaltyPointsUsed: pricing.loyaltyPointsUsed,
    loyaltyPointsDiscount: pricing.loyaltyPointsDiscount,
    totalPrice: pricing.totalPrice
  });

  for (const item of items) {
    await Product.updateOne({ _id: item.product }, { $inc: { countInStock: -item.qty } });
  }

  await consumeLoyaltyPoints(req.user._id, order, pricing.loyaltyPointsUsed);

  if (pricing.discountCode) {
    const freshUser = pricing.discountCodeSource === 'private' ? await User.findById(req.user._id) : null;
    await incrementDiscountCodeUsage({
      settings,
      user: freshUser,
      code: pricing.discountCode,
      source: pricing.discountCodeSource
    });
  }

  await notifyOrderManagers(order, req.user);

  res.status(201).json(order);
});

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone walletBalance loyaltyPoints');
  if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

  const isOwner = order.user?._id?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  res.json(order);
});

export const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email phone walletBalance loyaltyPoints')
    .sort({ createdAt: -1 });
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

  await restoreUsedLoyaltyPoints(order);
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

  await awardLoyaltyPointsIfEligible(order);
  await order.save();
  await notifyOrderCustomer(order, `تم تحديث طلبك إلى: ${order.status}`);
  res.json(order);
});
