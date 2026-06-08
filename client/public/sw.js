self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Burger El Khawaga', body: event.data?.text?.() || '' };
  }

  const title = payload.title || 'Burger El Khawaga';
  const options = {
    body: payload.body || '',
    tag: payload.tag || undefined,
    renotify: true,
    data: {
      url: payload.url || '/',
      ...(payload.data || {})
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      if ('focus' in client) {
        client.navigate(targetUrl).catch(() => undefined);
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }

    return undefined;
  })());
});
