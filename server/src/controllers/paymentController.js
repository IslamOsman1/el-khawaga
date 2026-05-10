import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendCustomerOrderWhatsAppNotification, sendNewOrderWhatsAppNotification } from '../utils/whatsapp.js';
import { ensureStoreSettings } from '../utils/storeSettings.js';
import { calculateOrderPricing, incrementDiscountCodeUsage } from '../utils/pricing.js';

const getStripeClient = async () => {
  const settings = await ensureStoreSettings();
  const secretKey = settings.payment?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

  if (!settings.payment?.onlinePaymentEnabled) {
    const error = new Error('الدفع الأونلاين غير مفعل حاليًا');
    error.statusCode = 400;
    throw error;
  }

  if (!secretKey) {
    const error = new Error('مفتاح Stripe السري غير موجود في الإعدادات');
    error.statusCode = 400;
    throw error;
  }

  return {
    stripe: new Stripe(secretKey),
    settings
  };
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

const consumeLoyaltyPoints = async (userId, order, usedPoints) => {
  if (!Number(usedPoints || 0)) return;

  const user = await User.findById(userId);
  if (!user) return;

  user.loyaltyPoints = Math.max(0, Number(user.loyaltyPoints || 0) - Number(usedPoints || 0));
  user.loyaltyHistory = [
    {
      amount: -Number(usedPoints || 0),
      reason: 'استخدام نقاط في طلب مدفوع أونلاين',
      order: order._id
    },
    ...(Array.isArray(user.loyaltyHistory) ? user.loyaltyHistory : [])
  ].slice(0, 30);
  await user.save();
};

export const createStripeCheckoutSession = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, discountCode, redeemLoyaltyPoints } = req.body;
  if (!orderItems?.length) {
    return res.status(400).json({ message: 'السلة فارغة' });
  }

  const items = await buildOrderItems(orderItems);
  const { stripe, settings } = await getStripeClient();
  const pricing = await calculateOrderPricing({
    settings,
    items,
    shippingAddress,
    discountCode,
    redeemLoyaltyPoints,
    user: req.user
  });
  if (pricing.totalPrice <= 0) {
    return res.status(400).json({ message: 'إجمالي الطلب بعد الخصومات يساوي صفرًا، اختر الدفع عند الاستلام لإتمام الطلب' });
  }
  const origin = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';

  const payload = JSON.stringify({
    userId: req.user._id.toString(),
    shippingAddress,
    items,
    discountCode: pricing.discountCode,
    discountCodeSource: pricing.discountCodeSource,
    discountCodeAmount: pricing.discountCodeAmount,
    loyaltyPointsUsed: pricing.loyaltyPointsUsed,
    loyaltyPointsDiscount: pricing.loyaltyPointsDiscount,
    itemsPrice: pricing.itemsPrice,
    shippingPrice: pricing.shippingPrice,
    totalPrice: pricing.totalPrice
  });

  const chargeableItems = [{
    quantity: 1,
    price_data: {
      currency: settings.payment?.currency || 'egp',
      unit_amount: Math.round(pricing.totalPrice * 100),
      product_data: {
        name: 'إجمالي الطلب بعد الخصومات'
      }
    }
  }];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/review?cancelled=1`,
    customer_email: req.user.email,
    metadata: {
      checkoutPayload: payload
    },
    line_items: chargeableItems
  });

  res.json({ url: session.url, sessionId: session.id });
});

export const verifyStripeCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { stripe, settings } = await getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return res.json({ paid: false, order: null });
  }

  let order = await Order.findOne({ paymentSessionId: session.id });

  if (!order) {
    const rawPayload = session.metadata?.checkoutPayload;
    if (!rawPayload) {
      return res.status(400).json({ message: 'بيانات الطلب غير موجودة داخل جلسة الدفع' });
    }

    const payload = JSON.parse(rawPayload);
    const isOwner = payload.userId === req.user._id.toString();

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
    }

    const refreshedItems = await buildOrderItems(
      payload.items.map((item) => ({
        product: item.product.toString(),
        qty: item.qty
      }))
    );

    order = await Order.create({
      user: payload.userId,
      orderItems: refreshedItems,
      shippingAddress: payload.shippingAddress,
      paymentMethod: 'دفع أونلاين',
      paymentProvider: settings.payment?.onlineProvider || 'stripe',
      paymentSessionId: session.id,
      paymentReference: session.payment_intent?.toString() || session.id,
      itemsPrice: payload.itemsPrice,
      shippingPrice: payload.shippingPrice,
      discountCode: payload.discountCode,
      discountCodeAmount: payload.discountCodeAmount,
      loyaltyPointsUsed: payload.loyaltyPointsUsed,
      loyaltyPointsDiscount: payload.loyaltyPointsDiscount,
      totalPrice: payload.totalPrice,
      isPaid: true,
      paidAt: new Date()
    });

    for (const item of refreshedItems) {
      await Product.updateOne({ _id: item.product }, { $inc: { countInStock: -item.qty } });
    }

    await consumeLoyaltyPoints(payload.userId, order, payload.loyaltyPointsUsed);

    if (payload.discountCode) {
      const freshUser = payload.discountCodeSource === 'private' ? await User.findById(payload.userId) : null;
      await incrementDiscountCodeUsage({
        settings,
        user: freshUser,
        code: payload.discountCode,
        source: payload.discountCodeSource
      });
    }

    const customer = await User.findById(payload.userId).select('name phone');

    await sendNewOrderWhatsAppNotification({
      order,
      customer,
      shippingAddress: payload.shippingAddress
    }).catch((error) => {
      console.error('WhatsApp notification error', {
        orderId: String(order._id || ''),
        message: error.message
      });
    });

    await sendCustomerOrderWhatsAppNotification({
      order,
      customer,
      shippingAddress: payload.shippingAddress
    }).catch((error) => {
      console.error('WhatsApp customer notification error', {
        orderId: String(order._id || ''),
        message: error.message
      });
    });
  }

  const isOwner = order.user?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'غير مصرح بهذه العملية' });
  }

  if (!order.isPaid) {
    order.isPaid = true;
    order.paidAt = order.paidAt || new Date();
    order.paymentProvider = settings.payment?.onlineProvider || 'stripe';
    order.paymentSessionId = session.id;
    order.paymentReference = session.payment_intent?.toString() || session.id;
    await order.save();
  }

  res.json({
    paid: order.isPaid,
    order
  });
});
