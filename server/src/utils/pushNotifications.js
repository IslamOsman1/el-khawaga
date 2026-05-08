import webpush from 'web-push';
import User from '../models/User.js';

const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || '').trim();

const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const isPushConfigured = () => pushEnabled;
export const getPushPublicKey = () => VAPID_PUBLIC_KEY;

export const normalizePushSubscription = (value = {}) => {
  const endpoint = String(value.endpoint || '').trim();
  const p256dh = String(value.keys?.p256dh || '').trim();
  const auth = String(value.keys?.auth || '').trim();
  const expirationTime = value.expirationTime == null ? null : Number(value.expirationTime);

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    expirationTime: Number.isFinite(expirationTime) ? expirationTime : null,
    keys: { p256dh, auth }
  };
};

const buildPayloadString = (payload = {}) => JSON.stringify({
  title: payload.title || 'Al Wekala',
  body: payload.body || '',
  url: payload.url || '/',
  tag: payload.tag || '',
  data: payload.data || {}
});

const isExpiredPushResponse = (error) => [404, 410].includes(Number(error?.statusCode || error?.status));

const sendNotificationToSubscription = async (subscription, payloadString) => {
  await webpush.sendNotification(subscription, payloadString);
};

export const sendPushToUsers = async (users = [], payload = {}) => {
  if (!pushEnabled || !Array.isArray(users) || !users.length) return;

  const payloadString = buildPayloadString(payload);

  await Promise.all(users.map(async (user) => {
    const subscriptions = Array.isArray(user.pushSubscriptions) ? user.pushSubscriptions : [];
    if (!subscriptions.length) return;

    const activeSubscriptions = [];

    for (const entry of subscriptions) {
      const subscription = normalizePushSubscription(entry);
      if (!subscription) continue;

      try {
        await sendNotificationToSubscription(subscription, payloadString);
        activeSubscriptions.push({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys,
          userAgent: String(entry.userAgent || '').trim(),
          createdAt: entry.createdAt || new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        if (!isExpiredPushResponse(error)) {
          console.error('Push send failed', {
            userId: String(user._id || ''),
            endpoint: subscription.endpoint,
            statusCode: error?.statusCode,
            body: error?.body
          });
          activeSubscriptions.push(entry);
        }
      }
    }

    if (activeSubscriptions.length !== subscriptions.length) {
      await User.updateOne(
        { _id: user._id },
        { $set: { pushSubscriptions: activeSubscriptions } }
      );
    }
  }));
};
