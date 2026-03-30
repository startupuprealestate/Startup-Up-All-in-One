import admin from 'firebase-admin';

// 💡 1. ยืนยันตัวตนกับ Firebase (ดึงรหัสจาก Vercel Environment)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // แก้ปัญหาการอ่านเว้นบรรทัดของ Private Key ใน Vercel
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export default async function handler(req, res) {
    // รับเฉพาะคำสั่ง POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, data } = req.body;
    const db = admin.firestore();

    try {
        // 💡 2. ไปกวาด Token มือถือของทุกคนในบริษัทมา
        const tokensSnap = await db.collection('fcm_tokens').get();
        const allTokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);

        if (allTokens.length === 0) return res.status(200).json({ message: 'ไม่มีเครื่องไหนเปิดรับการแจ้งเตือน' });

        let payload = null;

        // 💡 3. ตรวจสอบว่าเป็นการแจ้งเตือนแบบไหน
        if (action === 'leave') {
            payload = {
                notification: {
                    title: '📌 แจ้งเตือนวันหยุด/ลางานใหม่',
                    body: `คุณ ${data.assignee} ได้ลง ${data.leaveType || 'วันหยุด'} วันที่ ${data.date}`
                }
            };
        } else if (action === 'house') {
            payload = {
                notification: {
                    title: '🏠 อัปเดตบ้านสร้างเสร็จ!',
                    body: `โครงการ ${data.houseName} สร้างเสร็จเรียบร้อยแล้ว!`
                }
            };
        }

        // 💡 4. ยิงข้อความเข้ามือถือทุกคนพร้อมกัน
        if (payload) {
            await admin.messaging().sendEachForMulticast({ ...payload, tokens: allTokens });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
