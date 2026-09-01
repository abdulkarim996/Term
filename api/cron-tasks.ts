import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function initFirebase() {
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
}

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    initFirebase();
    const db = getFirestore();
    const messaging = getMessaging();

    // Calculate tomorrow range in Saudi time (UTC+3)
    const nowUTC = new Date();
    const nowSaudi = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
    const tomorrowSaudi = new Date(nowSaudi.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDateStr = tomorrowSaudi.toISOString().slice(0, 10); // YYYY-MM-DD

    // Tomorrow start/end in UTC ms
    const tomorrowStartUTC = new Date(`${tomorrowDateStr}T00:00:00+03:00`).getTime();
    const tomorrowEndUTC = new Date(`${tomorrowDateStr}T23:59:59+03:00`).getTime();

    const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
    let notified = 0;

    for (const userDoc of usersSnap.docs) {
      const fcmToken = userDoc.data().fcmToken;
      if (!fcmToken) continue;

      const uid = userDoc.id;
      const tasksSnap = await db
        .collection('users').doc(uid)
        .collection('tasks').get();

      const tasksDueTomorrow: string[] = [];

      tasksSnap.forEach(taskDoc => {
        const task = taskDoc.data();
        if (task.completed) return;
        if (!task.dueDate) return;
        const due = typeof task.dueDate === 'number' ? task.dueDate : task.dueDate?.toMillis?.() ?? 0;
        if (due >= tomorrowStartUTC && due <= tomorrowEndUTC) {
          tasksDueTomorrow.push(task.title || task.name || '\u0645\u0647\u0645\u0629');
        }
      });

      // Only send if there are tasks due tomorrow
      if (tasksDueTomorrow.length === 0) continue;

      const count = tasksDueTomorrow.length;
      const taskList = tasksDueTomorrow.slice(0, 3).join(' \u2022 ') + (count > 3 ? ` \u0648${count - 3} \u0623\u062e\u0631\u0649` : '');

      await messaging.send({
        token: fcmToken,
        notification: {
          title: `\u062a\u0630\u0643\u064a\u0631: \u0644\u062f\u064a\u0643 ${count} \u0645\u0647\u0645\u0629 \u063a\u062f\u0627\u064b \uD83D\uDCC5`,
          body: taskList,
        },
      }).catch(e => console.error('FCM tasks reminder error:', e));

      notified++;
    }

    return res.status(200).json({ success: true, usersNotified: notified });

  } catch (error: any) {
    console.error('Cron-tasks error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}