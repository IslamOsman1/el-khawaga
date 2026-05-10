import twilio from 'twilio';
import User from '../models/User.js';

const TWILIO_ACCOUNT_SID = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
const TWILIO_AUTH_TOKEN = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
const TWILIO_WHATSAPP_FROM = String(process.env.TWILIO_WHATSAPP_FROM || '').trim();
const TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID = String(process.env.TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID || '').trim();
const TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID = String(process.env.TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID || '').trim();

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

export const isWhatsAppConfigured = () => Boolean(twilioClient && TWILIO_WHATSAPP_FROM);

const warnWhatsAppSkip = (reason, details = {}) => {
  console.warn('WhatsApp notification skipped', {
    reason,
    ...details
  });
};

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

const buildFromAddress = () => (
  TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`
);

const buildToAddress = (to) => (
  to.startsWith('whatsapp:')
    ? to
    : `whatsapp:${to}`
);

const sendWhatsAppText = async ({ to, body }) => {
  await twilioClient.messages.create({
    body,
    from: buildFromAddress(),
    to: buildToAddress(to)
  });
};

const sendWhatsAppTemplate = async ({ to, contentSid, variables = {} }) => {
  await twilioClient.messages.create({
    from: buildFromAddress(),
    to: buildToAddress(to),
    contentSid,
    contentVariables: JSON.stringify(variables)
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
  if (!isWhatsAppConfigured()) {
    warnWhatsAppSkip('missing-config', {
      hasAccountSid: Boolean(TWILIO_ACCOUNT_SID),
      hasAuthToken: Boolean(TWILIO_AUTH_TOKEN),
      hasFrom: Boolean(TWILIO_WHATSAPP_FROM),
      orderId: String(order?._id || '')
    });
    return;
  }

  const recipients = await collectOrderManagers();
  if (!recipients.length) {
    warnWhatsAppSkip('no-manager-recipients', {
      orderId: String(order?._id || '')
    });
    return;
  }

  const itemsText = formatOrderItems(order.orderItems || []);
  const textMessage = [
    'طلب جديد في متجر الوكالة',
    `رقم الطلب: ${order._id}`,
    `العميل: ${customer?.name || shippingAddress?.fullName || 'غير محدد'}`,
    `الهاتف: ${shippingAddress?.phone || customer?.phone || 'غير متوفر'}`,
    `العنوان: ${`${shippingAddress?.city || ''} ${shippingAddress?.area || ''} ${shippingAddress?.street || ''}`.trim() || 'غير متوفر'}`,
    `الدفع: ${order.paymentMethod || 'غير محدد'}`,
    `الإجمالي: ${Number(order.totalPrice || 0).toFixed(2)} ج.م`,
    itemsText ? `المنتجات:\n${itemsText}` : 'المنتجات: غير متوفرة'
  ].join('\n');
  const templateVariables = {
    1: String(order?._id || ''),
    2: String(customer?.name || shippingAddress?.fullName || 'عميل جديد'),
    3: String(shippingAddress?.phone || customer?.phone || ''),
    4: String(Number(order?.totalPrice || 0).toFixed(2)),
    5: String(order?.paymentMethod || ''),
    6: String(`${shippingAddress?.city || ''} ${shippingAddress?.area || ''} ${shippingAddress?.street || ''}`.trim())
  };

  await Promise.all(recipients.map(async (recipient) => {
    try {
      if (TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID) {
        await sendWhatsAppTemplate({
          to: recipient.phone,
          contentSid: TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID,
          variables: templateVariables
        });
      } else {
        warnWhatsAppSkip('missing-admin-template-sid-falling-back-to-text', {
          recipient: recipient.phone,
          orderId: String(order?._id || '')
        });
        await sendWhatsAppText({ to: recipient.phone, body: textMessage });
      }
    } catch (error) {
      console.error('WhatsApp order notification failed', {
        recipient: recipient.phone,
        orderId: String(order?._id || ''),
        code: error?.code,
        status: error?.status,
        message: error?.message
      });
    }
  }));
};

export const sendCustomerOrderWhatsAppNotification = async ({ order, customer, shippingAddress }) => {
  if (!isWhatsAppConfigured()) {
    warnWhatsAppSkip('missing-config', {
      hasAccountSid: Boolean(TWILIO_ACCOUNT_SID),
      hasAuthToken: Boolean(TWILIO_AUTH_TOKEN),
      hasFrom: Boolean(TWILIO_WHATSAPP_FROM),
      orderId: String(order?._id || '')
    });
    return;
  }

  const recipientPhone = normalizeWhatsAppPhone(customer?.phone || shippingAddress?.phone || '');
  if (!recipientPhone) {
    warnWhatsAppSkip('invalid-customer-phone', {
      orderId: String(order?._id || ''),
      customerPhone: customer?.phone || '',
      shippingPhone: shippingAddress?.phone || ''
    });
    return;
  }

  const ordersUrl = buildCustomerOrdersUrl();
  const textMessageLines = [
    `شكراً لك ${customer?.name || shippingAddress?.fullName || 'عميلنا العزيز'}`,
    'تم استلام طلبك بنجاح في متجر الوكالة.',
    `رقم الطلب: ${order._id}`,
    `إجمالي الطلب: ${Number(order.totalPrice || 0).toFixed(2)} ج.م`,
    `طريقة الدفع: ${order.paymentMethod || 'غير محدد'}`
  ];

  if (ordersUrl) {
    textMessageLines.push(`تابع حالة طلبك من هنا: ${ordersUrl}`);
  }

  const templateVariables = {
    1: String(customer?.name || shippingAddress?.fullName || 'عميلنا العزيز'),
    2: String(order?._id || ''),
    3: String(Number(order?.totalPrice || 0).toFixed(2)),
    4: String(order?.paymentMethod || ''),
    5: String(ordersUrl || '')
  };

  try {
    if (TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID) {
      await sendWhatsAppTemplate({
        to: recipientPhone,
        contentSid: TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID,
        variables: templateVariables
      });
    } else {
      warnWhatsAppSkip('missing-customer-template-sid-falling-back-to-text', {
        recipient: recipientPhone,
        orderId: String(order?._id || '')
      });
      await sendWhatsAppText({
        to: recipientPhone,
        body: textMessageLines.join('\n')
      });
    }
  } catch (error) {
    console.error('WhatsApp customer order notification failed', {
      recipient: recipientPhone,
      orderId: String(order?._id || ''),
      code: error?.code,
      status: error?.status,
      message: error?.message
    });
  }
};
