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

    // 1. 🚨 แจ้งลางาน (เหมือนเดิม)
    if (action === 'leave') {
      title = `🚨 แจ้งลางาน: ${data.assignee}`;
      body = `ประเภท: ${data.leaveType}\nวันที่: ${data.date}\nเหตุผล: ${data.reason || '-'}`;
      clickUrl = `${baseUrl}/?tab=calendar&action=view_event&eventId=${data.eventId}`;
    } 
    // 2. 🏠 บ้านทำเสร็จ (แก้จาก house_history เป็น schedule ธรรมดา ป้องกันจอขาว)
    else if (action === 'house') {
      title = `🎉 อัปเดต: บ้านทำเสร็จแล้ว!`;
      body = `โครงการ: ${data.houseName}\nทำเสร็จเมื่อ: ${data.finishedDate}`;
      clickUrl = `${baseUrl}/?tab=schedule`; 
    } 
    // 3. 📢 พันธมิตร (Affiliate)
    else if (action === 'lead') {
      title = data.title || `📢 มี Lead ใหม่จาก Affiliate!`;
      body = data.body || `มีลูกค้าสนใจเข้ามาระบบค่ะ`;
      clickUrl = `${baseUrl}/?tab=affiliate`;
    } 
    // 4. 👥 เพื่อนแนะนำเพื่อน (แก้เป็น tab=affiliate ป้องกันจอขาว เพราะมันอยู่หน้าเดียวกัน)
    else if (action === 'friend_referral') {
      title = data.title || `👥 สมาชิกใหม่! Friend get friend`;
      body = data.body || `มีการแนะนำเพื่อนใหม่เข้ามาในระบบค่ะ`;
      clickUrl = `${baseUrl}/?tab=affiliate`; 
    }
    // 5. 📅 กิจกรรมทำงานของแต่ละคน (เหมือนเดิม)
    else if (action === 'task' || action === 'event') {
      title = data.title || `📅 งานใหม่/กิจกรรมของคุณ!`;
      body = data.body || `วันที่: ${data.date}\nรายละเอียด: คลิกเพื่อดูข้อมูล`;
      clickUrl = `${baseUrl}/?tab=calendar&action=view_date&date=${data.date}`;
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
          // แอบยัดลิงก์ลงในกระเป๋า data 
          data: { clickUrl: clickUrl }, 
          webpush: {
            fcmOptions: { link: clickUrl }
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
