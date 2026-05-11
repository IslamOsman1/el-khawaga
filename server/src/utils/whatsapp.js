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
  console.log('WhatsApp send mode', {
    mode: 'text',
    to,
    from: buildFromAddress()
  });
  const message = await twilioClient.messages.create({
    body,
    from: buildFromAddress(),
    to: buildToAddress(to)
  });
  return message;
};

const sendWhatsAppTemplate = async ({ to, contentSid, variables = {} }) => {
  console.log('WhatsApp send mode', {
    mode: 'template',
    to,
    from: buildFromAddress(),
    contentSid,
    variables
  });
  const message = await twilioClient.messages.create({
    from: buildFromAddress(),
    to: buildToAddress(to),
    contentSid,
    contentVariables: JSON.stringify(variables)
  });
  return message;
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

const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const buildCustomerOrdersUrl = (baseUrlOverride = '') => {
  const baseUrl = normalizeBaseUrl(baseUrlOverride) || normalizeBaseUrl(process.env.CLIENT_URL);
  if (!baseUrl) return '';
  return `${baseUrl}/orders`;
};

export const sendNewOrderWhatsAppNotification = async ({ order, customer, shippingAddress }) => {
  if (!isWhatsAppConfigured()) {
    const details = {
      hasAccountSid: Boolean(TWILIO_ACCOUNT_SID),
      hasAuthToken: Boolean(TWILIO_AUTH_TOKEN),
      hasFrom: Boolean(TWILIO_WHATSAPP_FROM),
      orderId: String(order?._id || '')
    };
    warnWhatsAppSkip('missing-config', details);
    return { sent: false, reason: 'missing-config', details };
  }

  const recipients = await collectOrderManagers();
  if (!recipients.length) {
    const details = {
      orderId: String(order?._id || '')
    };
    warnWhatsAppSkip('no-manager-recipients', details);
    return { sent: false, reason: 'no-manager-recipients', details };
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
    itemsText ? `المنتجات:\n${itemsText}` : 'المنتجات: غير متوفرة',
    'يرجى مراجعة الطلب والتواصل مع العميل إذا لزم الأمر.'
  ].join('\n');
  const templateVariables = {
    1: String(order?._id || ''),
    2: String(customer?.name || shippingAddress?.fullName || 'عميل جديد'),
    3: String(shippingAddress?.phone || customer?.phone || ''),
    4: `${Number(order?.totalPrice || 0).toFixed(2)} ج.م`,
    5: String(order?.paymentMethod || ''),
    6: String(`${shippingAddress?.city || ''} ${shippingAddress?.area || ''} ${shippingAddress?.street || ''}`.trim())
  };

  const results = await Promise.all(recipients.map(async (recipient) => {
    try {
      let message;
      if (TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID) {
        console.log('WhatsApp admin template selected', {
          orderId: String(order?._id || ''),
          recipient: recipient.phone,
          contentSid: TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID
        });
        message = await sendWhatsAppTemplate({
          to: recipient.phone,
          contentSid: TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID,
          variables: templateVariables
        });
      } else {
        warnWhatsAppSkip('missing-admin-template-sid-falling-back-to-text', {
          recipient: recipient.phone,
          orderId: String(order?._id || '')
        });
        message = await sendWhatsAppText({ to: recipient.phone, body: textMessage });
      }
      return {
        phone: recipient.phone,
        ok: true,
        sid: message?.sid || '',
        status: message?.status || '',
        errorCode: message?.errorCode || null,
        errorMessage: message?.errorMessage || ''
      };
    } catch (error) {
      console.error('WhatsApp order notification failed', {
        recipient: recipient.phone,
        orderId: String(order?._id || ''),
        code: error?.code,
        status: error?.status,
        message: error?.message
      });
      return {
        phone: recipient.phone,
        ok: false,
        code: error?.code,
        status: error?.status,
        message: error?.message
      };
    }
  }));

  return {
    sent: results.some((item) => item.ok),
    reason: results.some((item) => item.ok) ? 'completed' : 'all-failed',
    results
  };
};

export const sendCustomerOrderWhatsAppNotification = async ({ order, customer, shippingAddress, clientUrl = '' }) => {
  if (!isWhatsAppConfigured()) {
    const details = {
      hasAccountSid: Boolean(TWILIO_ACCOUNT_SID),
      hasAuthToken: Boolean(TWILIO_AUTH_TOKEN),
      hasFrom: Boolean(TWILIO_WHATSAPP_FROM),
      orderId: String(order?._id || '')
    };
    warnWhatsAppSkip('missing-config', details);
    return { sent: false, reason: 'missing-config', details };
  }

  const recipientPhone = normalizeWhatsAppPhone(customer?.phone || shippingAddress?.phone || '');
  if (!recipientPhone) {
    const details = {
      orderId: String(order?._id || ''),
      customerPhone: customer?.phone || '',
      shippingPhone: shippingAddress?.phone || ''
    };
    warnWhatsAppSkip('invalid-customer-phone', details);
    return { sent: false, reason: 'invalid-customer-phone', details };
  }

  const ordersUrl = buildCustomerOrdersUrl(clientUrl);
  const textMessageLines = [
    `مرحبًا ${customer?.name || shippingAddress?.fullName || 'عميلنا العزيز'}`,
    '',
    `تم استلام طلبك رقم ${order._id} من Al Wekala.`,
    '',
    `إجمالي الطلب: ${Number(order.totalPrice || 0).toFixed(2)} ج.م`,
    `طريقة الدفع: ${order.paymentMethod || 'غير محدد'}`,
    '',
    'يمكنك متابعة طلبك من هنا:'
  ];

  if (ordersUrl) {
    textMessageLines.push(ordersUrl);
    textMessageLines.push('');
  }

  textMessageLines.push('شكرًا لاختيارك Al Wekala.');

  const templateVariables = {
    1: String(customer?.name || shippingAddress?.fullName || 'عميلنا العزيز'),
    2: String(order?._id || ''),
    3: `${Number(order?.totalPrice || 0).toFixed(2)} ج.م`,
    4: String(order?.paymentMethod || ''),
    5: String(ordersUrl || '')
  };

  try {
    let message;
    if (TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID) {
      console.log('WhatsApp customer template selected', {
        orderId: String(order?._id || ''),
        recipient: recipientPhone,
        contentSid: TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID
      });
      message = await sendWhatsAppTemplate({
        to: recipientPhone,
        contentSid: TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID,
        variables: templateVariables
      });
    } else {
      warnWhatsAppSkip('missing-customer-template-sid-falling-back-to-text', {
        recipient: recipientPhone,
        orderId: String(order?._id || '')
      });
      message = await sendWhatsAppText({
        to: recipientPhone,
        body: textMessageLines.join('\n')
      });
    }
    return {
      sent: true,
      reason: 'completed',
      results: [{
        phone: recipientPhone,
        ok: true,
        sid: message?.sid || '',
        status: message?.status || '',
        errorCode: message?.errorCode || null,
        errorMessage: message?.errorMessage || ''
      }]
    };
  } catch (error) {
    console.error('WhatsApp customer order notification failed', {
      recipient: recipientPhone,
      orderId: String(order?._id || ''),
      code: error?.code,
      status: error?.status,
      message: error?.message
    });
    return {
      sent: false,
      reason: 'failed',
      results: [{
        phone: recipientPhone,
        ok: false,
        code: error?.code,
        status: error?.status,
        message: error?.message
      }]
    };
  }
};
