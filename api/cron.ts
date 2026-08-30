import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin with Service Account
if (!getApps().length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (privateKey.startsWith('\"')) privateKey = JSON.parse(privateKey);
  else privateKey = privateKey.replace(/\\n/g, '\n');

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
  // Security Check: Ensure only our cron-job can trigger this
  const authHeader = req.headers.authorization;
  if (authHeader !== \Bearer \\) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    
    // We only process if it's the daily 8 PM run (the user will reconfigure cron-job.org to run once a day)
    const tomorrowStart = new Date(now.getTime() + 24 * 3600000);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now.getTime() + 24 * 3600000);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Optimized Query: Only fetch users that have an fcmToken! 
    // This vastly reduces reads (0 reads for students without notifications enabled).
    // Note: To use orderBy and where, fcmToken must exist. We can check for string length if we want,
    // but > '' is a common trick to check for non-empty strings in Firestore.
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();
      
    const pushPromises = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token = userData.fcmToken;
      if (!token) continue;

      const uid = userDoc.id;

      // --- TASK REMINDERS (Daily Summary) ---
      try {
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
              title: 'ÊÐßíÑ ÇáãåÇã ??',
              body: \áÏíß ÛÏÇð (\) ãåÇã ÊäÊÙÑ ÅäÌÇÒß! ÈÇáÊæÝíÞ.\
            }
          }).catch(e => console.error('FCM Error (Task):', e)));
        }
      } catch(e) {
        console.error('Error fetching tasks:', e);
      }
    }

    await Promise.all(pushPromises);
    
    return res.status(200).json({ 
      success: true, 
      message: \Successfully processed \ scheduled daily summaries.\ 
    });

  } catch (error) {
    console.error('Cron Execution Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
