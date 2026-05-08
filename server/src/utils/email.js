import nodemailer from 'nodemailer';

const getEmailConfig = () => ({
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || ''
});

const ensureEmailEnabled = () => {
  const config = getEmailConfig();
  if (!config.host || !config.port || !config.user || !config.pass || !config.from) {
    const error = new Error('إرسال البريد الإلكتروني غير مفعل من إعدادات البيئة');
    error.statusCode = 400;
    throw error;
  }
  return config;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const config = ensureEmailEnabled();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('SMTP send failed', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user
    });

    const emailError = new Error('تعذر إرسال البريد الإلكتروني. تحقق من إعدادات SMTP على Render أو من مزود البريد.');
    emailError.statusCode = 502;
    emailError.cause = error;
    throw emailError;
  }
};
