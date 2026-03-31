import admin from 'firebase-admin';

// ตรวจสอบการเชื่อมต่อ Firebase หลังบ้าน
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
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = Date.now(); // เวลาปัจจุบัน

    // 1. ค้นหากิจกรรมที่ "ถึงเวลาเตือนแล้ว" และ "ยังไม่ได้เตือน"
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
        .where('isNotified', '==', false)
        .where('notifyAt', '<=', now)
        .get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'ยังไม่มีกิจกรรมที่ต้องแจ้งเตือนในนาทีนี้' });
    }

    let notifiedCount = 0;

    // 2. วนลูปส่งแจ้งเตือนทีละรายการ
    for (const doc of snapshot.docs) {
      const event = doc.data();

      // ค้นหา Token ของคนที่ต้องรับผิดชอบงานนี้
      const userTokensRef = await db.collection('fcm_tokens').where('ownerName', '==', event.assignee).get();

      if (!userTokensRef.empty) {
        const tokenDoc = userTokensRef.docs[0].data();
        
        // ส่งข้อความเข้ามือถือ
        await messaging.send({
          token: tokenDoc.token,
          notification: {
            title: '⏰ แจ้งเตือนกิจกรรม!',
            body: `คุณมีกิจกรรม: ${event.activity}\nเวลา: ${event.time} น.`,
          }
        });
      }

      // 3. อัปเดตในฐานข้อมูลว่า "เตือนแล้วนะ จะได้ไม่เตือนซ้ำ"
      await doc.ref.update({ isNotified: true });
      notifiedCount++;
    }

    res.status(200).json({ success: true, message: `ส่งแจ้งเตือนสำเร็จ ${notifiedCount} รายการ` });

  } catch (error) {
    console.error("Error sending reminders:", error);
    res.status(500).json({ error: error.message });
  }
}
