import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export default async function handler(req, res) {
  try {
    if (!getApps().length) {

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
            : undefined,
        }),
      });

    }

    const db = getFirestore();
    const messaging = getMessaging();

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const tomorrowStart = new Date(now.getTime() + 24 * 3600000);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now.getTime() + 24 * 3600000);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();
      
    const pushPromises = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token = userData.fcmToken;
      if (!token) continue;

      const uid = userDoc.id;
      const tasksSnap = await db.collection('users').doc(uid).collection('tasks').get();
      let tasksTomorrow = 0;

      tasksSnap.forEach(taskDoc => {
        const task = taskDoc.data();
        if (task.dueDate && !task.completed) {
          if (task.dueDate >= tomorrowStart.getTime() && task.dueDate <= tomorrowEnd.getTime()) {
            tasksTomorrow++;
          }
        }
      });

      if (tasksTomorrow > 0) {
        pushPromises.push(messaging.send({
          token: token,
          notification: {
            title: 'تذكير المهام 📅',
            body: `لديك غداً (${tasksTomorrow}) مهام تنتظر إنجازك! بالتوفيق.`
          }
        }).catch(e => console.error('FCM Error (Task):', e)));
      }
    }

    await Promise.all(pushPromises);
    return res.status(200).json({ 
      success: true, 
      message: `Successfully processed ${pushPromises.length} scheduled daily summaries.` 
    });

  } catch (error: any) {
    console.error('Global Error in cron.ts:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}