importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config ของคุณ
firebase.initializeApp({
  apiKey: "AIzaSyDYhao1y-8YpWHsjualiimZc8CJei7xbDY",
  authDomain: "startupuprealestate-e4b0a.firebaseapp.com",
  projectId: "startupuprealestate-e4b0a",
  storageBucket: "startupuprealestate-e4b0a.firebasestorage.app",
  messagingSenderId: "966000130004",
  appId: "1:966000130004:web:5318ddaf6d2225b0cc8841"
});

const messaging = firebase.messaging();

// ฟังก์ชันรับแจ้งเตือนเบื้องหลัง 
// (นำคำสั่ง showNotification ออก เพื่อให้เบราว์เซอร์โชว์อัตโนมัติแค่รอบเดียว)
messaging.onBackgroundMessage(function(payload) {
  console.log('ได้รับแจ้งเตือนตอนปิดแอป:', payload);
});
