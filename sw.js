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

// ✨ พอกดที่การแจ้งเตือนปุ๊บ ให้ดึงแอปขึ้นมาและส่งคำสั่งวาร์ป (อัปเกรดแล้ว!)
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // ปิดป้ายแจ้งเตือนหลังจากกด

  // 💡 1. ดึงลิงก์จากกระเป๋า data ที่เราแอบส่งมาจาก Vercel
  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  // ถ้ามีลิงก์ลับให้ใช้ลิงก์ลับ ถ้าไม่มีให้เปิดหน้าแรก (/)
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 กรณีที่ 1: ถ้าแอปเปิดค้างอยู่ (ไม่ว่าจะซ่อนอยู่เบื้องหลังหรือเปิดค้างไว้)
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        // 🚀 ตะโกนปลุกแอปที่ซ่อนอยู่ว่า "เปลี่ยนหน้าเป็นลิงก์นี้เดี๋ยวนี้!"
        client.postMessage({ type: 'APP_WAKE_UP', url: clickUrl });
        
        // ดึงหน้าแอปขึ้นมาโชว์บนหน้าจอ
        return client.focus();
      }
      
      // 💡 กรณีที่ 2: ถ้าแอปถูกปัดทิ้ง (Force Close) ปิดสนิทไปแล้ว
      // ให้เปิดหน้าต่างเว็บขึ้นมาใหม่ พร้อมกับลิงก์วาร์ปเลย
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
