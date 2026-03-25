importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config ของบริษัท
firebase.initializeApp({
  apiKey: "AIzaSyDYhao1y-8YpWHsjualiimZc8CJei7xbDY",
  authDomain: "startupuprealestate-e4b0a.firebaseapp.com",
  projectId: "startupuprealestate-e4b0a",
  storageBucket: "startupuprealestate-e4b0a.firebasestorage.app",
  messagingSenderId: "966000130004",
  appId: "1:966000130004:web:5318ddaf6d2225b0cc8841"
});

const messaging = firebase.messaging();

// 💡 (ลบ onBackgroundMessage ออกไปแล้ว เพื่อให้ Firebase จัดการเด้งแจ้งเตือนแค่อันเดียว ป้องกันการเบิ้ล)

// ✨ พอกดที่การแจ้งเตือนปุ๊บ ให้เปิดหน้าแอป หรือสลับไปหน้าแอปที่เปิดค้างไว้ทันที
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // ถ้าแอปเปิดค้างอยู่แล้ว ให้สลับหน้าจอไปหาแอป
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        return client.focus();
      }
      // ถ้าแอปปิดอยู่ ให้เปิดหน้าเว็บขึ้นมาใหม่
      return clients.openWindow('/');
    })
  );
});
