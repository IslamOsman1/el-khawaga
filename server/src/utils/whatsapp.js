import User from '../models/User.js';

const WHATSAPP_ACCESS_TOKEN = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const WHATSAPP_PHONE_NUMBER_ID = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_API_VERSION = String(process.env.WHATSAPP_API_VERSION || 'v20.0').trim();

export const isWhatsAppConfigured = () => Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);

const normalizeWhatsAppPhone = (phone = '') => {
  const cleaned = String(phone || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (/^01\d{9}$/.test(cleaned)) {
    return `20${cleaned}`;
  }

  if (/^\+20(1\d{9})$/.test(cleaned)) {
    return cleaned.replace('+', '');
  }

  if (/^20(1\d{9})$/.test(cleaned)) {
    return cleaned;
  }

  if (/^0020(1\d{9})$/.test(cleaned)) {
    return cleaned.slice(2);
  }

  if (/^\+\d{8,15}$/.test(cleaned)) {
    return cleaned.replace('+', '');
  }

  if (/^\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }

  return '';
};

const sendWhatsAppText = async ({ to, body }) => {
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`WhatsApp send failed: ${response.status} ${errorText}`);
  }
};

const collectOrderManagers = async () => {
  const users = await User.find({
    $or: [
      { role: 'admin' },
      { role: 'employee', permissions: 'manage_orders' }
    ]
  }).select('name phone role permissions');

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
    .map((item) => `- ${item.name} × ${item.qty}`)
    .join('\n')
);

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
    `العنوان: ${(shippingAddress?.city || '')} ${(shippingAddress?.area || '')} ${(shippingAddress?.street || '')}`.trim() || 'غير متوفر',
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
        message: error.message
      });
    }
  }));
};
