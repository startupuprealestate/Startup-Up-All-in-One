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
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, data } = req.body;
    const db = admin.firestore();

    try {
        const tokensSnap = await db.collection('fcm_tokens').get();
        const allTokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);

        if (allTokens.length === 0) return res.status(200).json({ message: 'ไม่มีเครื่องไหนเปิดรับการแจ้งเตือน' });

        let payload = null;

        // 💡 แก้ไขเงื่อนไขให้ถูกต้อง (ลบปีกกาที่เกินออกแล้วค่ะ)
        if (action === 'leave') {
            const requester = data.assignee || 'สมาชิกในทีม';
            const type = data.leaveType || 'ลางาน';
            const dateRange = data.date || '-';
            const reason = data.reason || data.note || data.details || 'ไม่ได้ระบุเหตุผล';

            payload = {
                notification: {
                    title: '🚨 แจ้งลางาน',
                    body: `${requester} ${type}\nวันที่: ${dateRange}\nเหตุผล: ${reason}`,
                },
                // เพิ่มข้อมูลสำหรับ iOS ให้เด้งดีขึ้น
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } }
            };
        } else if (action === 'house') {
            payload = {
                notification: {
                    title: '🏠 อัปเดตบ้านสร้างเสร็จ!',
                    body: `โครงการ ${data.houseName} สร้างเสร็จเรียบร้อยแล้ว!`
                },
                apns: { payload: { aps: { sound: 'default' } } }
            };
        }

        // 💡 ยิงข้อความเข้ามือถือทุกคน
        if (payload) {
            const response = await admin.messaging().sendEachForMulticast({ 
                ...payload, 
                tokens: allTokens 
            });
            console.log('ส่งสำเร็จ:', response.successCount);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error Detail:", error);
        res.status(500).json({ error: error.message });
    }
}
