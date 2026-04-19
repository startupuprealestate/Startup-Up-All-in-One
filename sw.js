// 🚨 1. ต้องเอาตัวดักจับการกดมาไว้ "บนสุด" ของไฟล์ เพื่อดักหน้า Firebase!
self.addEventListener('notificationclick', function(event) {
  event.stopImmediatePropagation(); // คำสั่งระงับไม่ให้ Firebase มาแย่งการทำงาน
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  // เติมรหัสเวลาเพื่อหลอกให้ระบบมองว่าเป็นลิงก์ใหม่เสมอ จะได้ยอมรีเฟรชหน้า
  const finalUrl = clickUrl + (clickUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 กรณีแอปพับอยู่เบื้องหลัง
      if (clientList.length > 0) {
        let client = clientList.find(c => c.focused) || clientList[0];
        return client.focus().then(c => {
           const target = c || client;
           // บังคับเปลี่ยน URL หน้าเว็บทันที! (ทะลุแอปค้างได้ 100%)
           return target.navigate(finalUrl); 
        });
      }
      
      // 💡 กรณีแอปปิดสนิท (Force Close)
      if (clients.openWindow) {
        return clients.openWindow(finalUrl);
      }
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
