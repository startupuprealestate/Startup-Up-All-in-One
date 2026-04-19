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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, data } = req.body;
  const db = admin.firestore();
  const messaging = admin.messaging();

  try {
    let title = '';
    let body = '';
    
    // 💡 1. สร้างตัวแปรเก็บลิงก์วาร์ป
    // (เปลี่ยนเป็นลิงก์เว็บ Vercel ของพี่บิวนะคะ)
    const baseUrl = 'https://startup-up-all-in-one.vercel.app'; 
    let clickUrl = baseUrl;

    if (action === 'leave') {
      title = `🚨 แจ้งลางาน: ${data.assignee}`;
      body = `ประเภท: ${data.leaveType}\nวันที่: ${data.date}\nเหตุผล: ${data.reason || '-'}`;
      clickUrl = `${baseUrl}/?tab=calendar`; // วาร์ปไปหน้าปฏิทิน
    } 
    else if (action === 'house') {
      title = `🎉 อัปเดต: บ้านทำเสร็จแล้ว!`;
      body = `โครงการ: ${data.houseName}\nทำเสร็จเมื่อ: ${data.finishedDate}`;
      clickUrl = `${baseUrl}/?tab=stock`; // วาร์ปไปหน้าสต็อกบ้าน
    } 
    else if (action === 'lead') {
      title = data.title;
      body = data.body;
      clickUrl = `${baseUrl}/?tab=affiliate`; // วาร์ปไปหน้า Affiliate
    } 
    else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const tokensSnapshot = await db.collection('fcm_tokens').get();
    if (tokensSnapshot.empty) {
      return res.status(200).json({ message: "ไม่มี Token ของผู้ใช้ในระบบ" });
    }

    let successCount = 0;

    for (const doc of tokensSnapshot.docs) {
      const tokenData = doc.data();
      try {
        await messaging.send({
          token: tokenData.token,
          notification: {
            title: title,
            body: body,
          },
          // 💡 2. แนบลิงก์วาร์ปไปกับแจ้งเตือนตรงนี้!
          webpush: {
            fcmOptions: {
              link: clickUrl
            }
          },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } }
        });
        successCount++;
      } catch (err) {
        console.error("ส่งไม่สำเร็จ:", tokenData.ownerEmail);
      }
    }

    return res.status(200).json({ success: true, notified: successCount });

  } catch (error) {
    console.error("Trigger Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
