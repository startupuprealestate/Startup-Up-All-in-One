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

// ✨ กลับคืนสู่สามัญ: ใช้คำสั่งบังคับเปิดหน้าต่างใหม่ (Apple ปฏิเสธไม่ได้!)
self.addEventListener('notificationclick', function(event) {
  event.stopImmediatePropagation(); 
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  // 💡 ทริคสำคัญ: เติมรหัสเวลาต่อท้าย URL เพื่อหลอกให้ Apple คิดว่าเป็น "ลิงก์ใหม่เอี่ยม" และต้องโหลดใหม่เท่านั้น!
  const finalUrl = clickUrl + (clickUrl.includes('?') ? '&' : '?') + 'refresh=' + Date.now();

  // ไม่ต้องเช็กแล้วว่าแอปหลับหรือตื่น สั่ง "เปิดหน้าต่างใหม่" ทื่อๆ เลย!
  // (ใน iOS PWA คำสั่งนี้จะดึงแอปขึ้นมาและบังคับรีเฟรชหน้าให้เองค่ะ)
  event.waitUntil(
    clients.openWindow(finalUrl)
  );
});
