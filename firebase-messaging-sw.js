/* TRLista - Firebase Cloud Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

async function initMessaging() {
  const response = await fetch('/api/client-config', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo leer /api/client-config');

  const payload = await response.json();
  const firebaseConfig = payload.firebaseConfig || {};
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = required.filter((key) => !firebaseConfig[key]);
  if (missing.length) throw new Error('Faltan variables Firebase cliente: ' + missing.join(', '));

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  return firebase.messaging();
}

const messagingReady = initMessaging();

messagingReady.then((messaging) => {
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};
    const requestId = data.requestId || '';
    const title = notification.title || 'Nueva solicitud a bodega';
    const body = notification.body || (data.storeName ? `${data.storeName} envió una solicitud.` : 'Hay una nueva solicitud pendiente.');

    self.registration.showNotification(title, {
      body,
      icon: '/assets/img/trlogo.png',
      badge: '/assets/img/trlogo.png',
      tag: requestId ? `trlista-${requestId}` : 'trlista-warehouse-request',
      data: { requestId, url: requestId ? `/?requestId=${encodeURIComponent(requestId)}` : '/' },
      requireInteraction: false
    });
  });
}).catch((error) => {
  console.error('No se pudo inicializar Firebase Messaging en el service worker:', error);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const absoluteTarget = new URL(targetUrl, self.location.origin).href;

    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(absoluteTarget);
        return;
      }
    }

    if (clients.openWindow) return clients.openWindow(absoluteTarget);
  })());
});
