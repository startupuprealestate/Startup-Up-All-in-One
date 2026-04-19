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

// ✨ ไม้ตายทะลวงแอปแช่แข็ง: ตะโกนปลุกย้ำๆ จนกว่าแอปจะตื่น!
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 

  const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data;
  const clickUrl = fcmData?.clickUrl || event.notification.data?.fcmOptions?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      // 💡 ถ้าแอปถูกพับอยู่เบื้องหลัง (มันกำลังโดนแช่แข็ง)
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; break; }
        }
        
        return client.focus().then(c => {
           const targetClient = c || client;
           // 🚀 ทริคระดับโลก: ส่งคำสั่งย้ำๆ 4 รอบ! 
           // เพราะ iOS ต้องใช้เวลา 1-2 วินาทีในการละลายน้ำแข็งแอป
           targetClient.postMessage({ type: 'APP_WAKE_UP', url: clickUrl }); // ยิงทันที
           setTimeout(() => targetClient.postMessage({ type: 'APP_WAKE_UP', url: clickUrl }), 500);  // ยิงซ้ำครึ่งวิ
           setTimeout(() => targetClient.postMessage({ type: 'APP_WAKE_UP', url: clickUrl }), 1500); // ยิงซ้ำวิครึ่ง
           setTimeout(() => targetClient.postMessage({ type: 'APP_WAKE_UP', url: clickUrl }), 3000); // ยิงซ้ำสามวิ (ชัวร์สุด)
        });
      }
      
      // 💡 ถ้าแอปปิดสนิท (Force Close)
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
