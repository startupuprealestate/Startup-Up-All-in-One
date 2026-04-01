import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = Date.now() + 60000; 

    // 1. ดึงงานที่ถึงเวลาแจ้งเตือน
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
        .where('isNotified', '==', false)
        .where('notifyAt', '<=', now)
        .limit(10)
        .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "ok", message: 'ไม่มีงานที่ค้างส่ง' });
    }

    // 💡 2. สมุดหน้าเหลืองอัตโนมัติ (ดึงจากหน้า Admin ที่พี่พิมพ์ไว้)
    const usersSnapshot = await db.collection('users').get();
    const dynamicDictionary = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // เอาชื่อเล่นในระบบ มาจับคู่กับ อีเมล
      if (userData.systemName && userData.email) {
        dynamicDictionary[userData.systemName.toLowerCase().trim()] = userData.email.toLowerCase().trim();
      }
    });

    // 3. โหลด Token มือถือทั้งหมดมาเตรียมยิง
    const allTokensSnapshot = await db.collection('fcm_tokens').get();
    const allTokens = [];
    allTokensSnapshot.forEach(doc => allTokens.push(doc.data()));

    let notifiedCount = 0;

    for (const eventDoc of snapshot.docs) {
      const event = eventDoc.data();
      const targetAssignee = (event.assignee || '').toLowerCase().trim();

      // 💡 4. ถามสมุดหน้าเหลืองว่า ชื่อนี้ใช้อีเมลอะไร?
      const targetEmail = dynamicDictionary[targetAssignee];

      let matchedTokens = [];

      if (targetEmail) {
        // หา Token ด้วยอีเมลเป๊ะๆ 100%
        matchedTokens = allTokens.filter(t => (t.ownerEmail || '').toLowerCase() === targetEmail);
      } else {
        // แผนสำรอง: ถ้าใน Admin ลืมพิมพ์ชื่อเล่นไว้ ให้ค้นหาจากชื่อ Google แทน
        matchedTokens = allTokens.filter(t => {
            const name = (t.ownerName || '').toLowerCase();
            const email = (t.ownerEmail || '').toLowerCase();
            return name.includes(targetAssignee) || email.includes(targetAssignee);
        });
      }

      if (matchedTokens.length > 0) {
        for (const tokenData of matchedTokens) {
          try {
            await messaging.send({
              token: tokenData.token,
              notification: {
                title: '🚨 แจ้งเตือน: ' + event.activity,
                body: `ใกล้ถึงเวลา! (${event.time} น.)\nรายละเอียด: ${event.note || '-'}`,
              },
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } }
            });
          } catch (sendErr) {
            console.log("Token นี้อาจจะหมดอายุ:", tokenData.ownerEmail);
          }
        }
      }

      await eventDoc.ref.update({ isNotified: true });
      notifiedCount++;
    }

    return res.status(200).json({ success: true, count: notifiedCount });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
