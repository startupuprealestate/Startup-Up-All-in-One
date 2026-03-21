const CACHE_NAME = 'startup-up-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// ติดตั้ง Service Worker และ Cache ไฟล์พื้นฐาน
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// ทำงานเมื่อมีการเรียกใช้ Network (Offline Support เบื้องต้น)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ถ้าเจอใน Cache ให้ส่งกลับเลย ถ้าไม่เจอให้ดึงจากเน็ต
        return response || fetch(event.request);
      })
  );
});

// ลบ Cache เก่าทิ้งเมื่อมีการอัปเดต
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
