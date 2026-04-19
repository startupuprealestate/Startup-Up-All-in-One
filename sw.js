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

// ✨ อาวุธหนัก: ดึงแอปขึ้นมา แล้วส่งข้อความไปเปลี่ยนหน้าต่างภายใน (ไม่รีเฟรชเว็บ)
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 

  // ดึงลิงก์ลับที่เราซ่อนไว้
  const clickUrl = event.notification?.data?.clickUrl || event.notification?.data?.FCM_MSG?.data?.clickUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 ถ้าแอปเปิดค้างอยู่เบื้องหลัง
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; break; }
        }
        // 1. ส่งข้อความปลุกแอป (React จะรับหน้าที่เปลี่ยนหน้าให้เอง)
        client.postMessage({ type: 'APP_WAKE_UP', url: clickUrl });
        // 2. ดึงแอปขึ้นมาโชว์บนหน้าจอ
        return client.focus();
      }
      
      // 💡 ถ้าแอปปิดสนิทไปแล้ว (Force Close)
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
