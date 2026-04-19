// ✨ ระบบตู้ล็อกเกอร์: ทะลวงการแช่แข็งของ iOS ได้ 100%
self.addEventListener('notificationclick', function(event) {
  event.stopImmediatePropagation(); 
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';
  
  // เติมรหัสเวลาเพื่อหลอกให้เป็นลิงก์ใหม่
  const finalUrl = clickUrl + (clickUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

  event.waitUntil(
    // 💡 เปิดตู้ล็อกเกอร์ แล้วยัด URL เอาไว้
    caches.open('pwa-wakes').then(cache => {
      return cache.put('/pending-notification', new Response(finalUrl)).then(() => {
        // ดึงแอปขึ้นมาหน้าจอ (เพื่อให้แอปตื่นมาไขตู้ล็อกเกอร์)
        return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
          if (clientList.length > 0) {
            let client = clientList.find(c => c.focused) || clientList[0];
            return client.focus();
          }
          if (clients.openWindow) return clients.openWindow(finalUrl);
        });
      });
    })
  );
});

// =======================================================
// ⬇️ 2. โค้ดตั้งค่า Firebase ของเดิม ย้ายมาไว้ด้านล่างสุด ⬇️
// =======================================================

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDYhao1y-8YpWHsjualiimZc8CJei7xbDY",
  authDomain: "startupuprealestate-e4b0a.firebaseapp.com",
  projectId: "startupuprealestate-e4b0a",
  storageBucket: "startupuprealestate-e4b0a.firebasestorage.app",
  messagingSenderId: "966000130004",
  appId: "1:966000130004:web:5318ddaf6d2225b0cc8841"
});

const messaging = firebase.messaging();
