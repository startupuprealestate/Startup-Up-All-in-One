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

// ✨ ระบบระดับโลก: ใช้ Broadcast Channel และบังคับโหลดหน้าใหม่เจาะทะลุแอปแช่แข็ง
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  let clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  // 💡 ทริคระดับ Pro: เติมรหัสเวลาต่อท้าย URL เพื่อบังคับให้มือถือคิดว่าเป็น "ลิงก์ใหม่" เสมอ และต้องรีเฟรชหน้า!
  clickUrl = clickUrl + (clickUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

  // สร้างช่องทางวิทยุสื่อสารฉุกเฉิน
  const broadcast = new BroadcastChannel('startup_channel');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; break; }
        }
        
        return client.focus().then(c => {
           // 1. ประกาศผ่านวิทยุสื่อสาร (รวดเร็ว ทะลุการแช่แข็ง)
           broadcast.postMessage({ type: 'FORCE_WAKE', url: clickUrl });
           
           // 2. เตะปลั๊ก: บังคับเบราว์เซอร์ให้โหลดหน้าใหม่ตามลิงก์ทันที (ชัวร์ 100%)
           if (c && 'navigate' in c) return c.navigate(clickUrl);
           return client.navigate(clickUrl);
        });
      }
      
      // ถ้าแอปปิดสนิท (Force Close)
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
