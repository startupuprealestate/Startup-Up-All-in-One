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

// ✨ อาวุธหนัก: พอกดแจ้งเตือนปุ๊บ ดึงจอก่อน แล้วถีบเปลี่ยนหน้า!
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 ถ้าแอปยังเปิดอยู่เบื้องหลัง
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        
        // 1. ดึงแอปขึ้นมาโชว์บนหน้าจอก่อน
        return client.focus().then(c => {
           // 2. ส่งข้อความตะโกนปลุกไปที่หูทิพย์ (ที่เราฝังไว้หน้าเว็บ)
           c.postMessage({ type: 'APP_WAKE_UP', url: clickUrl });
           // 3. ย้ำอีกรอบด้วยคำสั่ง navigate เผื่อมือถือบางเครื่องขี้เกียจ
           return c.navigate(clickUrl);
        });
      }
      
      // 💡 ถ้าแอปปิดสนิท (Force Close)
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
