import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        
        // ตรวจสอบว่ามีข้อมูลไหม
        if (!serviceAccountRaw) {
            throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
        }

        // พยายามแปลงเป็น Object (รองรับทั้งแบบ String และ Object)
        const serviceAccount = typeof serviceAccountRaw === 'string' 
            ? JSON.parse(serviceAccountRaw.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, ''))
            : serviceAccountRaw;

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Connected!");
    } catch (error) {
        console.error("❌ Firebase Init Error:", error.message);
        // ส่ง Error กลับไปที่หน้า Log เพื่อดูว่าค่าที่อ่านได้คืออะไร (เอาแค่ 20 ตัวแรกเพื่อความปลอดภัย)
        throw new Error(`Init Failed: ${error.message}. Data start with: ${process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 20)}`);
    }
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
