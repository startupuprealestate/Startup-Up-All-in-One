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
    const db = admin.firestore();
    
    // 💡 1. ดึงเวลาปัจจุบัน และแปลงเป็นเวลาประเทศไทย (UTC+7)
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const todayStr = `${thaiTime.getFullYear()}-${String(thaiTime.getMonth() + 1).padStart(2, '0')}-${String(thaiTime.getDate()).padStart(2, '0')}`;

    try {
        // 💡 2. ค้นหากิจกรรมทั้งหมดที่กำลังจะมาถึง
        const eventsSnap = await db.collection('events').where('date', '>=', todayStr).get();
        const notificationsToSend = [];

        eventsSnap.forEach(doc => {
            const ev = doc.data();
            // ข้ามถ้าไม่มีเวลา หรือไม่ได้ตั้งเตือนล่วงหน้า (ตั้งเป็น 0 หรือว่าง)
            if (!ev.time || !ev.reminder || ev.reminder === "0") return;

            const [evHour, evMin] = ev.time.split(':').map(Number);
            const reminderMins = parseInt(ev.reminder);

            // คำนวณเวลาที่กิจกรรมเริ่ม (ในไทย)
            const [eY, eM, eD] = ev.date.split('-').map(Number);
            const eventDateObj = new Date(eY, eM - 1, eD, evHour, evMin);

            // ลบเวลาแจ้งเตือนล่วงหน้าออก จะได้ "เวลาที่ต้องแจ้งเตือนเป๊ะๆ"
            const alertDateObj = new Date(eventDateObj.getTime() - (reminderMins * 60000));

            // 💡 3. ตรวจสอบว่า "เวลาที่ต้องแจ้งเตือน" ตรงกับ "เวลาปัจจุบัน" (ระดับนาที) หรือไม่
            if (
                alertDateObj.getFullYear() === thaiTime.getFullYear() &&
                alertDateObj.getMonth() === thaiTime.getMonth() &&
                alertDateObj.getDate() === thaiTime.getDate() &&
                alertDateObj.getHours() === thaiTime.getHours() &&
                alertDateObj.getMinutes() === thaiTime.getMinutes()
            ) {
                // ถ้าตรงเป๊ะ ให้เตรียมส่งแจ้งเตือน
                let timeText = reminderMins >= 1440 ? `${reminderMins/1440} วัน` : reminderMins >= 60 ? `${reminderMins/60} ชม.` : `${reminderMins} นาที`;
                notificationsToSend.push({
                    assignee: ev.assignee,
                    title: '⏰ แจ้งเตือนกิจกรรม',
                    body: `"${ev.activity}" จะเริ่มในอีก ${timeText} (เวลา ${ev.time} น.)`
                });
            }
        });

        // 💡 4. ส่งข้อความไปหาเจ้าของงานทีละคน
        let sentCount = 0;
        for (const alert of notificationsToSend) {
            // หา Token ของพนักงานคนนั้น (ดูจากชื่อ)
            const tokensSnap = await db.collection('fcm_tokens').where('ownerName', '==', alert.assignee).get();
            const tokens = tokensSnap.docs.map(t => t.data().token).filter(Boolean);

            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    notification: { title: alert.title, body: alert.body },
                    tokens: tokens
                });
                sentCount++;
            }
        }

        res.status(200).json({ success: true, message: `Checked events. Sent ${sentCount} reminders.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
