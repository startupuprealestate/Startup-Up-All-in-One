const admin = require('firebase-admin');

// 1. ตรวจสอบการเชื่อมต่อ Firebase Admin
if (!admin.apps.length) {
  // ดึงค่า JSON ก้อนใหญ่ที่พี่ตั้งไว้ มาแปลงเป็น Object
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  // รับเฉพาะ POST Request เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { action, data } = req.body;
    let title = 'มีการอัปเดตใหม่ในระบบ';
    let body = 'คลิกเพื่อดูรายละเอียด';

    // 2. จัดเตรียมข้อความแจ้งเตือนตาม Action ที่ส่งมาจากหน้าเว็บ
    if (action === 'leave') {
      title = `แจ้งเตือน: ${data.leaveType || 'การลางาน'} 📅`;
      body = `คุณ ${data.assignee} ได้เพิ่มรายการ${data.leaveType || 'ลา'} ในวันที่ ${data.date}`;
    } else if (action === 'house') {
      title = 'อัปเดต: บ้านทำเสร็จแล้ว 🏠';
      body = `โครงการ ${data.houseName} ลงวันที่ตรวจรับทำเสร็จเรียบร้อยแล้ว`;
    }

    // 3. ดึง Token ของมือถือ/คอม "ทุกเครื่อง" จากคอลเลกชัน fcm_tokens
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('fcm_tokens').get();
    
    if (tokensSnapshot.empty) {
      return res.status(200).json({ message: 'ยังไม่มีใครกดอนุญาตรับการแจ้งเตือนในระบบเลยค่ะ' });
    }

    // เอาเฉพาะ string token ออกมาใส่ Array
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    // 4. สร้าง Payload ส่งแบบหลายเครื่อง
    const message = {
      notification: { title, body },
      tokens: tokens, // <--- ส่ง Token เข้าไปเป็น Array
    };

    // 5. สั่งยิงแจ้งเตือน
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // 6. ระบบทำความสะอาด: ลบ Token ที่หมดอายุ
    if (response.failureCount > 0) {
       const failedTokens = [];
       response.responses.forEach((resp, idx) => {
         if (!resp.success) {
           if (resp.error.code === 'messaging/invalid-registration-token' ||
               resp.error.code === 'messaging/registration-token-not-registered') {
             failedTokens.push(tokens[idx]);
           }
         }
       });
       
       if(failedTokens.length > 0) {
           const batch = db.batch();
           tokensSnapshot.docs.forEach(doc => {
               if (failedTokens.includes(doc.data().token)) {
                   batch.delete(doc.ref);
               }
           });
           await batch.commit();
       }
    }

    return res.status(200).json({ 
        success: true, 
        sentCount: response.successCount, 
        failedCount: response.failureCount 
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: error.message });
  }
}
