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

// ✨ ระบบฝากจดหมายลับ: หลบหลีกการแช่แข็งของ iOS 100%
let pendingUrlToOpen = null; // ยามเตรียมสมุดจดไว้

self.addEventListener('notificationclick', function(event) {
  event.stopImmediatePropagation(); 
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  // 💡 1. ยามจด URL เอาไว้ในมือ แล้วรอก่อน!
  pendingUrlToOpen = clickUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList.find(c => c.focused) || clientList[0];
        return client.focus(); // 2. แค่ดึงแอปขึ้นมาหน้าจอเฉยๆ (ไม่ต้องตะโกนเรียกแล้ว เพราะแอปมันหูหนวกอยู่)
      }
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});

// 💡 3. เมื่อแอปตื่นแล้วเดินมาถาม ยามก็จะยื่นจดหมายให้!
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CHECK_PENDING_NOTIFICATION') {
    if (pendingUrlToOpen) {
      event.source.postMessage({ type: 'APP_WAKE_UP', url: pendingUrlToOpen });
      pendingUrlToOpen = null; // ให้จดหมายเสร็จก็ฉีกทิ้ง
    }
  }
});
