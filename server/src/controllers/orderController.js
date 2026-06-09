import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/pushNotifications.js';
import {
  sendCustomerOrderWhatsAppNotification,
  sendNewOrderWhatsAppNotification
} from '../utils/whatsapp.js';
import { calculateOrderPricing, incrementDiscountCodeUsage } from '../utils/pricing.js';
import { ensureStoreSettings } from '../utils/storeSettings.js';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;
const resolveClientUrl = (req) => process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';

const buildOrderItems = async (orderItems) => {
  const ids = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } });

  return orderItems.map((item) => {
    const product = products.find((entry) => entry._id.toString() === item.product);
    if (!product) throw new Error('منتج غير موجود');
    const hasTrackedStock = product.countInStock !== null && product.countInStock !== undefined;
    if (hasTrackedStock && Number(product.countInStock) < Number(item.qty || 0)) {
      throw new Error(`الكمية غير متاحة: ${product.name}`);
    }

    return {
      product: product._id,
      name: product.name,
      qty: item.qty,
      image: product.image?.url,
      price: product.price
    };
  });
};

const adjustTrackedStock = async (productId, qtyDelta) => {
  await Product.updateOne(
    {
      _id: productId,
      countInStock: { $ne: null }
    },
    { $inc: { countInStock: qtyDelta } }
  );
};

const canUserCancelOrder = (order) => {
  if (!order) return false;
  if (order.status !== 'جديد') return false;
  return Date.now() - new Date(order.createdAt).getTime() <= CANCEL_WINDOW_MS;
};

const restoreUsedLoyaltyPoints = async () => {};

const consumeLoyaltyPoints = async () => {};

const awardLoyaltyPointsIfEligible = async (order) => {
  if (!order || order.status !== 'تم التسليم' || order.loyaltyPointsAwarded) return;
  order.loyaltyPointsAwarded = true;
  order.loyaltyPointsAmount = 0;
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
    await adjustTrackedStock(item.product, -Number(item.qty || 0));
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
  console.log('WhatsApp hook reached for createOrder', {
    orderId: String(order._id || ''),
    customerId: String(req.user?._id || ''),
    paymentMethod: order.paymentMethod
  });
  const adminWhatsAppResult = await sendNewOrderWhatsAppNotification({
    order,
    customer: req.user,
    shippingAddress
  }).catch((error) => {
    console.error('WhatsApp notification error', {
      orderId: String(order._id || ''),
      message: error.message
    });
    return { sent: false, reason: 'threw', message: error.message };
  });
  console.log('WhatsApp admin notification attempt finished', {
    orderId: String(order._id || ''),
    result: JSON.stringify(adminWhatsAppResult, null, 2)
  });
  const customerWhatsAppResult = await sendCustomerOrderWhatsAppNotification({
    order,
    customer: req.user,
    shippingAddress,
    clientUrl: resolveClientUrl(req)
  }).catch((error) => {
    console.error('WhatsApp customer notification error', {
      orderId: String(order._id || ''),
      message: error.message
    });
    return { sent: false, reason: 'threw', message: error.message };
  });
  console.log('WhatsApp customer notification attempt finished', {
    orderId: String(order._id || ''),
    result: JSON.stringify(customerWhatsAppResult, null, 2)
  });

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
    await adjustTrackedStock(item.product, Number(item.qty || 0));
  }

  await restoreUsedLoyaltyPoints(order);
  await order.save();

  res.json({
    message: 'تم إلغاء الطلب بنجاح',
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
