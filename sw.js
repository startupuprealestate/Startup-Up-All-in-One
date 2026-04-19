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

// ✨ ท่าไม้ตายสุดท้าย: บล็อก Firebase แย่งซีน + สาดข้อความปลุกทุกหน้าต่าง!
self.addEventListener('notificationclick', function(event) {
  // 🚨 1. เตะสกัด: สั่งหยุดการทำงานของ Firebase ตัวอื่นๆ ที่จะมาแย่งจัดการการกดปุ่มนี้!
  event.stopImmediatePropagation(); 
  
  event.notification.close(); // ปิดป้ายแจ้งเตือน

  // ดึงลิงก์จาก Vercel
  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 กรณีแอปเปิดค้างอยู่เบื้องหลัง
      if (clientList.length > 0) {
        // หาหน้าต่างที่กำลังใช้งานอยู่ หรือเอาหน้าต่างแรกที่เจอ
        let client = clientList.find(c => c.focused) || clientList[0];
        
        return client.focus().then(() => {
            // 🚀 2. ปูพรม: สาดข้อความปลุกไปหา "ทุกหน้าต่าง" ของแอป (กันพลาดว่ามันไปผิดหน้า)
            clientList.forEach(c => {
                c.postMessage({ type: 'APP_WAKE_UP', url: clickUrl });
            });
        });
      }
      
      // 💡 กรณีแอปปิดสนิท
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
