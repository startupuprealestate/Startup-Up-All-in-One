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
  // บังคับให้ Vercel ไม่ทำ Cache หน้าเว็บ (ป้องกันปัญหาต้องรีเฟรชเอง)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    // 💡 แก้ไขเรื่องเวลา: ใช้เวลาปัจจุบันแบบสากลและเผื่อบัฟเฟอร์ 1 นาที
    const now = Date.now() + 60000; 

    const eventsRef = db.collection('events');
    // ดึงรายการที่ถึงเวลาแล้ว และยังไม่ได้แจ้งเตือน
    const snapshot = await eventsRef
        .where('isNotified', '==', false)
        .where('notifyAt', '<=', now)
        .limit(10) // ดึงมาทีละ 10 รายการเพื่อประหยัด Read
        .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "ok", message: 'ไม่มีงานที่ค้างส่ง' });
    }

    let notifiedCount = 0;

    for (const eventDoc of snapshot.docs) {
      const event = eventDoc.data();

      // ค้นหา Token ของพนักงานคนนั้นๆ
      const userTokensRef = await db.collection('fcm_tokens')
                                    .where('ownerName', '==', event.assignee)
                                    .get();

      if (!userTokensRef.empty) {
        for (const tokenDoc of userTokensRef.docs) {
          const tokenData = tokenDoc.data();
          try {
            await messaging.send({
              token: tokenData.token,
              notification: {
                title: '🔔 แจ้งเตือน: ' + event.activity,
                body: `ถึงเวลาแล้วค่ะ! (${event.time} น.)\nรายละเอียด: ${event.note || '-'}`,
              },
              // ตั้งค่าสำหรับ Android/iOS ให้เด้งแรงๆ
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } }
            });
          } catch (sendErr) {
            console.log("Token นี้อาจจะหมดอายุ:", tokenData.ownerEmail);
          }
        }
      }

      // ✅ บันทึกทันทีว่าแจ้งเตือนแล้ว
      await eventDoc.ref.update({ isNotified: true });
      notifiedCount++;
    }

    return res.status(200).json({ success: true, count: notifiedCount });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
