const admin = require('firebase-admin');

// เชื่อมต่อ Firebase หลังบ้าน
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
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { action, data } = req.body;
  const db = admin.firestore();
  
  try {
    // 1. ดึง Token ของทุกคนในบริษัทเพื่อยิงแจ้งเตือน
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokens = tokensSnap.docs.map(doc => doc.data().token);
    
    if (tokens.length === 0) return res.status(200).json({ message: 'No devices registered for notifications' });

    let payload = {};

    // 2. สร้างรูปแบบการแจ้งเตือนตาม Action
    if (action === 'leave') {
      payload = {
        notification: {
          title: `🏖️ แจ้งลางาน: ${data.assignee}`,
          body: `วันที่: ${data.date}\nเหตุผล: ${data.note || '-'}`,
        }
      };
    } else if (action === 'house') {
      payload = {
        notification: {
          title: `✅ อัปเดตบ้านทำเสร็จ!`,
          body: `โครงการ: ${data.houseName}\nทำเสร็จเมื่อ: ${data.finishedDate}`,
        }
      };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // 3. ส่ง Push Notification ไปยังมือถือทุกเครื่อง
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: payload.notification,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
