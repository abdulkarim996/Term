import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin with Service Account
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle escaped newlines in Vercel environment variables
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
  // 1. Security Check: Ensure only our cron-job can trigger this
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const saudiTime = new Date(utc + (3600000 * 3)); // UTC+3
    
    const dayOfWeek = saudiTime.getDay();
    const hours = saudiTime.getHours();
    const minutes = saudiTime.getMinutes();

    const tomorrowStart = new Date(now.getTime() + 24 * 3600000);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now.getTime() + 24 * 3600000);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const usersSnap = await db.collection('users').get();
    const pushPromises = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token = userData.fcmToken;
      if (!token) continue;

      const uid = userDoc.id;

      // --- 1. LECTURE REMINDERS ---
      try {
        const subjectsSnap = await db.collection('users').doc(uid).collection('subjects').get();
        subjectsSnap.forEach(subjectDoc => {
          const subject = subjectDoc.data();
          if (subject.lectures && Array.isArray(subject.lectures)) {
            subject.lectures.forEach(lec => {
              if (lec.dayOfWeek === dayOfWeek && lec.startTime) {
                 const parts = lec.startTime.split(':');
                 if(parts.length === 2) {
                   const lecH = parseInt(parts[0], 10);
                   const lecM = parseInt(parts[1], 10);
                   const lecTotalMins = lecH * 60 + lecM;
                   const nowTotalMins = hours * 60 + minutes;
                   const diff = lecTotalMins - nowTotalMins;

                   // If lecture starts within the next 15 minutes
                   if (diff > 0 && diff <= 10) {
                     pushPromises.push(messaging.send({
                       token: token,
                       notification: {
                         title: 'محاضرة قادمة ⏳',
                         body: `تبدأ محاضرتك ${subject.name} خلال ${diff} دقيقة.`
                       }
                     }).catch(e => console.error('FCM Error (Lecture):', e)));
                   }
                 }
              }
            });
          }
        });
      } catch(e) {
        console.error('Error fetching subjects:', e);
      }

      // --- 2. TASK REMINDERS ---
      // Execute only once a day around 8:00 PM (20:xx)
      if (hours === 20 && minutes < 10) {
        try {
          const tasksSnap = await db.collection('users').doc(uid).collection('tasks').get();
          tasksSnap.forEach(taskDoc => {
            const task = taskDoc.data();
            if (task.dueDate && !task.completed) {
              if (task.dueDate >= tomorrowStart.getTime() && task.dueDate <= tomorrowEnd.getTime()) {
                pushPromises.push(messaging.send({
                  token: token,
                  notification: {
                    title: 'تذكير تسليم ⚠️',
                    body: `لديك ${task.title} يجب إنجازه غداً.`
                  }
                }).catch(e => console.error('FCM Error (Task):', e)));
              }
            }
          });
        } catch(e) {
          console.error('Error fetching tasks:', e);
        }
      }
    }

    await Promise.all(pushPromises);
    
    return res.status(200).json({ 
      success: true, 
      message: `Successfully processed ${pushPromises.length} scheduled reminders.` 
    });

  } catch (error) {
    console.error('Cron Execution Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
