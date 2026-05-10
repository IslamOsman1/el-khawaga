import twilio from 'twilio';
import User from '../models/User.js';

const TWILIO_ACCOUNT_SID = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
const TWILIO_AUTH_TOKEN = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
const TWILIO_WHATSAPP_FROM = String(process.env.TWILIO_WHATSAPP_FROM || '').trim();

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

export const isWhatsAppConfigured = () => Boolean(twilioClient && TWILIO_WHATSAPP_FROM);

const normalizeWhatsAppPhone = (phone = '') => {
  const cleaned = String(phone || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (/^01\d{9}$/.test(cleaned)) {
    return `+20${cleaned}`;
  }

  if (/^20(1\d{9})$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^0020(1\d{9})$/.test(cleaned)) {
    return `+${cleaned.slice(2)}`;
  }

  if (/^\+\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^\d{8,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return '';
};

const sendWhatsAppText = async ({ to, body }) => {
  const from = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;
  const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  await twilioClient.messages.create({
    body,
    from,
    to: recipient
  });
};

const collectOrderManagers = async () => {
  const users = await User.find({
    $or: [
      { role: 'admin' },
      { role: 'employee', permissions: 'manage_orders' }
    ]
  }).select('name phone');

  const uniqueRecipients = new Map();

  for (const user of users) {
    const normalizedPhone = normalizeWhatsAppPhone(user.phone);
    if (!normalizedPhone) continue;
    if (!uniqueRecipients.has(normalizedPhone)) {
      uniqueRecipients.set(normalizedPhone, {
        name: user.name || 'فريق الطلبات',
        phone: normalizedPhone
      });
    }
  }

  return [...uniqueRecipients.values()];
};

const formatOrderItems = (items = []) => (
  items
    .slice(0, 8)
    .map((item) => `- ${item.name} x ${item.qty}`)
    .join('\n')
);

const buildCustomerOrdersUrl = () => {
  const baseUrl = String(process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return '';
  return `${baseUrl}/orders`;
};

export const sendNewOrderWhatsAppNotification = async ({ order, customer, shippingAddress }) => {
  if (!isWhatsAppConfigured()) return;

  const recipients = await collectOrderManagers();
  if (!recipients.length) return;

  const itemsText = formatOrderItems(order.orderItems || []);
  const message = [
    'طلب جديد في متجر الوكالة',
    `رقم الطلب: ${order._id}`,
    `العميل: ${customer?.name || shippingAddress?.fullName || 'غير محدد'}`,
    `الهاتف: ${shippingAddress?.phone || customer?.phone || 'غير متوفر'}`,
    `العنوان: ${`${shippingAddress?.city || ''} ${shippingAddress?.area || ''} ${shippingAddress?.street || ''}`.trim() || 'غير متوفر'}`,
    `الدفع: ${order.paymentMethod || 'غير محدد'}`,
    `الإجمالي: ${Number(order.totalPrice || 0).toFixed(2)} ج.م`,
    itemsText ? `المنتجات:\n${itemsText}` : 'المنتجات: غير متوفرة'
  ].join('\n');

  await Promise.all(recipients.map(async (recipient) => {
    try {
      await sendWhatsAppText({ to: recipient.phone, body: message });
    } catch (error) {
      console.error('WhatsApp order notification failed', {
        recipient: recipient.phone,
        orderId: String(order._id || ''),
        code: error?.code,
        status: error?.status,
        message: error?.message
      });
    }
  }));
};

export const sendCustomerOrderWhatsAppNotification = async ({ order, customer, shippingAddress }) => {
  if (!isWhatsAppConfigured()) return;

  const recipientPhone = normalizeWhatsAppPhone(customer?.phone || shippingAddress?.phone || '');
  if (!recipientPhone) return;

  const ordersUrl = buildCustomerOrdersUrl();
  const messageLines = [
    `شكراً لك ${customer?.name || shippingAddress?.fullName || 'عميلنا العزيز'}`,
    'تم استلام طلبك بنجاح في متجر الوكالة.',
    `رقم الطلب: ${order._id}`,
    `إجمالي الطلب: ${Number(order.totalPrice || 0).toFixed(2)} ج.م`,
    `طريقة الدفع: ${order.paymentMethod || 'غير محدد'}`
  ];

  if (ordersUrl) {
    messageLines.push(`تابع حالة طلبك من هنا: ${ordersUrl}`);
  }

  try {
    await sendWhatsAppText({
      to: recipientPhone,
      body: messageLines.join('\n')
    });
  } catch (error) {
    console.error('WhatsApp customer order notification failed', {
      recipient: recipientPhone,
      orderId: String(order._id || ''),
      code: error?.code,
      status: error?.status,
      message: error?.message
    });
  }
};
