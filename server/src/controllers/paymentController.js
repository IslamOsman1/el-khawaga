import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ensureStoreSettings } from '../utils/storeSettings.js';

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

export const createStripeCheckoutSession = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress } = req.body;
  if (!orderItems?.length) {
    return res.status(400).json({ message: 'السلة فارغة' });
  }

  const items = await buildOrderItems(orderItems);
  const itemsPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingPrice = await calculateShippingPrice(itemsPrice);
  const totalPrice = itemsPrice + shippingPrice;

  const { stripe, settings } = await getStripeClient();
  const origin = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';

  const payload = JSON.stringify({
    userId: req.user._id.toString(),
    shippingAddress,
    items,
    itemsPrice,
    shippingPrice,
    totalPrice
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/review?cancelled=1`,
    customer_email: req.user.email,
    metadata: {
      checkoutPayload: payload
    },
    line_items: items.map((item) => ({
      quantity: item.qty,
      price_data: {
        currency: settings.payment?.currency || 'egp',
        unit_amount: Math.round(item.price * 100),
        product_data: {
          name: item.name
        }
      }
    })).concat(shippingPrice ? [{
      quantity: 1,
      price_data: {
        currency: settings.payment?.currency || 'egp',
        unit_amount: Math.round(shippingPrice * 100),
        product_data: {
          name: 'رسوم الشحن'
        }
      }
    }] : [])
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
      totalPrice: payload.totalPrice,
      isPaid: true,
      paidAt: new Date()
    });

    for (const item of refreshedItems) {
      await Product.updateOne({ _id: item.product }, { $inc: { countInStock: -item.qty } });
    }
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
