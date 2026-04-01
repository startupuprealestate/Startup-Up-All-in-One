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

// 💡 1. สร้าง "สมุดหน้าเหลือง" จับคู่ชื่อเล่นกับอีเมล Google ของพนักงาน
// ตัวพิมพ์เล็กทั้งหมดด้านซ้าย คือชื่อที่เลือกใน Dropdown หน้าเว็บ
// ด้านขวา คืออีเมล Google ที่เขาใช้ล็อกอินเข้าแอป
const staffDictionary = {
  "boom": "bloom27742@hotmail.com",
  "boat": "ใส่อีเมลของโบ๊ทที่นี่@gmail.com",
  "may": "ใส่อีเมลของเมย์ที่นี่@gmail.com",
  "noey": "ใส่อีเมลของเนยที่นี่@gmail.com",
  "ketar": "ใส่อีเมลของกีต้าร์ที่นี่@gmail.com",
  "peth": "ใส่อีเมลของเพชรที่นี่@gmail.com",
  "beau": "ใส่อีเมลของบิวที่นี่@gmail.com",
  "perth": "ใส่อีเมลของเพิร์ธที่นี่@gmail.com",
  "ter": "ใส่อีเมลของเต๋อที่นี่@gmail.com",
  "bumb": "ใส่อีเมลของบุ๋มที่นี่@gmail.com",
  "weerwi": "ใส่อีเมลของวีรวิชญ์ที่นี่@gmail.com",
  "ไม้": "ใส่อีเมลของไม้ที่นี่@gmail.com",
  "เพจกลาง": "ใส่อีเมลเพจกลาง@gmail.com"
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = Date.now() + 60000; 

    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
        .where('isNotified', '==', false)
        .where('notifyAt', '<=', now)
        .limit(10)
        .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "ok", message: 'ไม่มีงานที่ค้างส่ง' });
    }

    const allTokensSnapshot = await db.collection('fcm_tokens').get();
    const allTokens = [];
    allTokensSnapshot.forEach(doc => allTokens.push(doc.data()));

    let notifiedCount = 0;

    for (const eventDoc of snapshot.docs) {
      const event = eventDoc.data();
      const targetAssignee = (event.assignee || '').toLowerCase().trim();

      // 💡 2. เปิดสมุดหน้าเหลืองค้นหาอีเมลเป้าหมาย
      const targetEmail = staffDictionary[targetAssignee];

      let matchedTokens = [];

      if (targetEmail) {
        // ถ้าเจออีเมลในสมุดหน้าเหลือง ให้ค้นหา Token จากอีเมลเป๊ะๆ เลย
        matchedTokens = allTokens.filter(t => (t.ownerEmail || '').toLowerCase() === targetEmail);
      } else {
        // แผนสำรอง: ถ้าลืมใส่อีเมลในสมุดหน้าเหลือง ให้ใช้วิธีค้นหาจากชื่อเหมือนเดิม
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
