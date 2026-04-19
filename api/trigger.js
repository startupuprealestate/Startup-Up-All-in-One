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
    
    const baseUrl = 'https://startup-up-all-in-one.vercel.app'; 
    let clickUrl = baseUrl;

    if (action === 'leave') {
      title = `🚨 แจ้งลางาน: ${data.assignee}`;
      body = `ประเภท: ${data.leaveType}\nวันที่: ${data.date}\nเหตุผล: ${data.reason || '-'}`;
      // ✅ วาร์ปไปหน้าปฏิทิน + ส่งคำสั่งเปิดป๊อปอัป (action=view_event) + รหัส eventId
      clickUrl = `${baseUrl}/?tab=calendar&action=view_event&eventId=${data.eventId}`;
    } 
    else if (action === 'house') {
      title = `🎉 อัปเดต: บ้านทำเสร็จแล้ว!`;
      body = `โครงการ: ${data.houseName}\nทำเสร็จเมื่อ: ${data.finishedDate}`;
      // 💡 จุดที่ปรับเพิ่ม: เปลี่ยนจาก search เป็นคำสั่งเปิดป๊อปอัปยินดี (view_house) + รหัส houseId
      clickUrl = `${baseUrl}/?tab=schedule&action=view_house&houseId=${data.houseId}`;
    } 
    else if (action === 'lead') {
      title = data.title;
      body = data.body;
      clickUrl = `${baseUrl}/?tab=affiliate`;
    } 
    // 💡 เพิ่มเผื่อไว้สำหรับกิจกรรมนัดหมายทั่วไปในปฏิทิน
    else if (action === 'event') {
      title = data.title || '📅 แจ้งเตือนนัดหมาย!';
      body = data.body || 'มีกิจกรรมนัดหมาย รีบเข้ามาดูในปฏิทินนะคะ';
      clickUrl = `${baseUrl}/?tab=calendar&action=view_event&eventId=${data.eventId}`;
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
          // 💡 1. แอบยัดลิงก์ลงในกระเป๋า data เพื่อเตรียมส่งจดหมายลับ
          data: { clickUrl: clickUrl }, 
          
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
