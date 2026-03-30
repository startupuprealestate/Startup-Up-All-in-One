import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // 💡 บรรทัดนี้สำคัญมาก: มันจะเปลี่ยน \n ใน Vercel ให้เป็นบรรทัดใหม่ที่ Firebase อ่านออก
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
    // ดึงข้อมูลรายละเอียดการลา (ตรวจสอบชื่อตัวแปรให้ตรงกับที่ส่งมาจากหน้าบ้านนะคะ)
    const requester = data.assignee || 'สมาชิกในทีม';
    const type = data.leaveType || 'ลางาน';
    const dateRange = data.date || '-';
    const reason = data.reason || 'ไม่ได้ระบุเหตุผล';

    payload = {
        notification: {
            title: '📢 แจ้งลางาน',
            body: `คุณ ${requester} ขอลง ${type}\nวันที่: ${dateRange}\nเหตุผล: ${reason}`,
            icon: 'https://startup-up-all-in-one.vercel.app/icon-192x192.png',
            badge: 'https://startup-up-all-in-one.vercel.app/icon-192x192.png'
        }
    };
}
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
