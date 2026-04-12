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

    // ดึงงานที่ยังไม่ได้เตือน และ ถึงเวลาเตือนแล้ว เท่านั้น!
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
        .where('isNotified', '==', false)
        .where('notifyAt', '<=', now)
        .limit(10)
        .get();

    // 💡 1.1 นำมากรอง "เวลา" ด้วย JavaScript แทน
    const docsToNotify = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.notifyAt && data.notifyAt <= now;
    }).slice(0, 10);

    // ถ้าไม่มีงาน ให้รีบปิดจบทันที 
    if (docsToNotify.length === 0) {
      return res.status(200).json({ status: "ok", message: 'ไม่มีงานที่ค้างส่ง' });
    }

    // 💡 2. สั่งโหลดพนักงานและกุญแจ "พร้อมกัน" (วิ่งทางด่วน)
    const [usersSnapshot, allTokensSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('fcm_tokens').get()
    ]);

    const dynamicDictionary = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data() || {};
      if (userData.systemName && userData.email) {
        dynamicDictionary[String(userData.systemName).toLowerCase().trim()] = String(userData.email).toLowerCase().trim();
      }
    });

    const allTokens = [];
    allTokensSnapshot.forEach(doc => allTokens.push(doc.data() || {}));

    let notifiedCount = 0;

    // 💡 3. ลูปเฉพาะตัวที่กรองเวลาผ่านแล้ว
    for (const eventDoc of docsToNotify) { 
      const event = eventDoc.data() || {};
      const targetAssignee = String(event.assignee || '').toLowerCase().trim();

      if (!targetAssignee) {
         await eventDoc.ref.update({ isNotified: true }); 
         continue;
      }

      const targetEmail = dynamicDictionary[targetAssignee];
      let matchedTokens = [];

      if (targetEmail) {
        matchedTokens = allTokens.filter(t => String(t.ownerEmail || '').toLowerCase() === targetEmail);
      } else {
        matchedTokens = allTokens.filter(t => {
            const name = String(t.ownerName || '').toLowerCase();
            const email = String(t.ownerEmail || '').toLowerCase();
            return name.includes(targetAssignee) || email.includes(targetAssignee);
        });
      }

      if (matchedTokens.length > 0) {
        // ยิงแจ้งเตือนแบบขนานเพื่อความไว
        const sendPromises = matchedTokens.map(tokenData => {
          if (!tokenData.token) return Promise.resolve();
          return messaging.send({
            token: tokenData.token,
            notification: {
              title: '🚨 แจ้งเตือน: ' + (event.activity || 'กิจกรรมใหม่'),
              body: `ใกล้ถึงเวลา! (${event.time || '-'} น.)\nรายละเอียด: ${event.note || '-'}`,
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } }
          }).catch(err => console.log("Token error:", err.message));
        });
        
        await Promise.all(sendPromises);
      }

      await eventDoc.ref.update({ isNotified: true });
      notifiedCount++;
    }

    return res.status(200).json({ success: true, count: notifiedCount });

  } catch (error) {
    console.error("Critical Error in check-reminders:", error);
    return res.status(500).json({ error: error.message });
  }
}
