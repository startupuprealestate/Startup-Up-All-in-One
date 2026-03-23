importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config ของคุณ
firebase.initializeApp({
  apiKey: "AIzaSyDYhao1y-8YpWHsjualiimZc8CJei7xbDY",
  authDomain: "startupuprealestate-e4b0a.firebaseapp.com",
  projectId: "startupuprealestate-e4b0a",
  storageBucket: "startupuprealestate-e4b0a.firebasestorage.app",
  messagingSenderId: "966000130004",
  appId: "1:966000130004:web:5318ddaf6d2225b0cc8841"
});

const messaging = firebase.messaging();

// ฟังก์ชันรับแจ้งเตือนเบื้องหลัง 
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    // ✨ ใช้ tag รวบข้อความที่ชื่อซ้ำกันให้เหลืออันเดียว
    tag: notificationTitle,
    // อนุญาตให้สั่นแจ้งเตือนได้ แม้จะเป็นข้อความที่รวบมาแล้ว
    renotify: true 
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
