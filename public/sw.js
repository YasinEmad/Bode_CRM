self.addEventListener('push', function (event) {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    console.error('SW push parse error', e);
  }
  console.log('[SW] push received', payload);

  const title = payload.title || 'Notification';
  const options = {
    body: payload.message || payload.body || '',
    data: payload.data || {},
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      try {
        const clientList = await clients.matchAll({ includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({ type: 'push', payload });
        }
      } catch (e) {
        console.error('[SW] postMessage error', e);
      }
    })()
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
