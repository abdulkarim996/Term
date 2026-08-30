importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCBZ-ZhKJEkPzZ3voDMtEkN894AISjlJh0",
  authDomain: "student-dashboard-6e0c1.firebaseapp.com",
  projectId: "student-dashboard-6e0c1",
  storageBucket: "student-dashboard-6e0c1.firebasestorage.app",
  messagingSenderId: "599529502181",
  appId: "1:599529502181:web:ba06c38f6212ce37a76b0c"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  // If payload has a 'notification' object, Firebase automatically displays it. 
  // We only showNotification manually if it's a data-only payload.
  if (payload.notification) {
    return; 
  }

  const notificationTitle = payload.data?.title || 'تِرْم';
  const notificationOptions = {
    body: payload.data?.body,
    icon: '/icon-v2-192.png',
    badge: '/icon-v2-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
