import api from '../api/api.js';

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
};

const ensureServiceWorkerRegistration = async () => {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
};

export const ensurePushSubscription = async () => {
  if (
    typeof window === 'undefined'
    || !('serviceWorker' in navigator)
    || !('PushManager' in window)
    || !('Notification' in window)
    || window.Notification.permission !== 'granted'
    || !localStorage.getItem('token')
  ) {
    return { ok: false, reason: 'unsupported-or-not-allowed' };
  }

  const registration = await ensureServiceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { data } = await api.get('/users/me/push-config');
    if (!data?.enabled || !data?.publicKey) {
      return { ok: false, reason: 'not-configured' };
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });
  }

  await api.post('/users/me/push-subscription', {
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent
  });

  return { ok: true };
};

export const removePushSubscription = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const subscription = await registration?.pushManager?.getSubscription?.();
  const endpoint = subscription?.endpoint;

  if (endpoint && localStorage.getItem('token')) {
    await api.delete('/users/me/push-subscription', { data: { endpoint } }).catch(() => undefined);
  }

  await subscription?.unsubscribe?.().catch(() => undefined);
};
