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

// ✨ พอกดที่การแจ้งเตือนปุ๊บ ให้บังคับเปลี่ยนหน้าทันที! (อัปเกรดทะลุแอปแช่แข็ง)
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // ปิดป้ายแจ้งเตือน

  // 1. ดึงลิงก์จากกระเป๋า data
  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 กรณีที่ 1: ถ้าแอปเปิดอยู่ (ไม่ว่าจะพับอยู่เบื้องหลัง หรืออยู่หน้าจอ)
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        
        // 🚀 ไม้เรียว: บังคับให้แอปหน้านั้น "เปลี่ยน URL และรีเฟรชตัวเอง" ไปหน้าข้อมูลทันที!
        return client.navigate(clickUrl).then(c => {
            if (c) return c.focus();
            return client.focus();
        });
      }
      
      // 💡 กรณีที่ 2: ถ้าแอปถูกปัดทิ้ง (Force Close) ไปแล้ว
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
