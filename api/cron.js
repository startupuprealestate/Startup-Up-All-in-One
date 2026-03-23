const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin Init Error:', error);
  }
}

export default async function handler(req, res) {
  const db = admin.firestore();
  const now = new Date();
  // Vercel Cron ใช้ UTC ให้แปลงเป็นเวลาไทย (+7) หรือเช็คแบบ Absolute
  
  try {
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokens = tokensSnap.docs.map(doc => doc.data().token);
    
    if (tokens.length === 0) return res.status(200).json({ message: 'No devices registered' });

    // ดึงกิจกรรม (event) ทั้งหมด
    const eventsSnap = await db.collection('events').where('type', '==', 'event').get();
    const notifications = [];
    const batch = db.batch();

    eventsSnap.forEach(doc => {
      const ev = doc.data();
      if (ev.time && ev.date && !ev.notified24h) {
        const [y, m, d] = ev.date.split('-');
        const [hr, min] = ev.time.split(':');
        const eventDate = new Date(y, m - 1, d, hr, min);
        
        const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // ถ้าระยะเวลาห่าง 23-24 ชั่วโมง ให้ส่งแจ้งเตือน
        if (hoursDiff > 23 && hoursDiff <= 24) {
           notifications.push({
             title: `⏰ พรุ่งนี้มีกิจกรรม: ${ev.activity}`,
             body: `เวลา: ${ev.time} น.\nผู้รับผิดชอบ: ${ev.assignee}\nหมายเหตุ: ${ev.note || '-'}`
           });
           batch.update(doc.ref, { notified24h: true });
        }
      }
    });

    if (notifications.length > 0) {
      const messages = notifications.map(notif => ({
         notification: notif,
         tokens: tokens
      }));
      
      for (const msg of messages) {
         await admin.messaging().sendEachForMulticast(msg);
      }
      await batch.commit();
    }

    res.status(200).json({ sentCount: notifications.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
