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
  // รับเฉพาะคำสั่ง POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, data } = req.body;
  const db = admin.firestore();
  const messaging = admin.messaging();

  try {
    let title = '';
    let body = '';

    // จัดเตรียมข้อความตามประเภทการแจ้งเตือน
    if (action === 'leave') {
      title = `🚨 แจ้งลางาน: ${data.assignee}`;
      body = `ประเภท: ${data.leaveType}\nวันที่: ${data.date}\nเหตุผล: ${data.reason || '-'}`;
    } else if (action === 'house') {
      title = `🎉 อัปเดต: บ้านทำเสร็จแล้ว!`;
      body = `โครงการ: ${data.houseName}\nทำเสร็จเมื่อ: ${data.finishedDate}`;
    } 
    // 👇 💡 จุดที่เพิ่มเข้ามาใหม่: สอนให้ Vercel รู้จักแจ้งเตือนลูกค้า Affiliate 👇
    else if (action === 'lead') {
      title = data.title;
      body = data.body;
    } 
    // 👆 จบส่วนที่เพิ่มใหม่ 👆
    else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    // ดึง Token ของ "ทุกคน" ในตารางมาใช้งาน
    const tokensSnapshot = await db.collection('fcm_tokens').get();

    if (tokensSnapshot.empty) {
      return res.status(200).json({ message: "ไม่มี Token ของผู้ใช้ในระบบ" });
    }

    let successCount = 0;

    // ยิงแจ้งเตือนให้ "ทุกคน" ที่เคยกดรับการแจ้งเตือนไว้
    for (const doc of tokensSnapshot.docs) {
      const tokenData = doc.data();
      try {
        await messaging.send({
          token: tokenData.token,
          notification: {
            title: title,
            body: body,
          },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } }
        });
        successCount++;
      } catch (err) {
        console.error("ส่งไม่สำเร็จ (Token อาจหมดอายุ):", tokenData.ownerEmail);
      }
    }

    return res.status(200).json({ success: true, notified: successCount });

  } catch (error) {
    console.error("Trigger Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
