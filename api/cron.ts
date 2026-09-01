import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { Client } from '@upstash/qstash';

// Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_NAMES = [
  '\u0627\u0644\u0623\u062d\u062f',
  '\u0627\u0644\u0625\u062b\u0646\u064a\u0646',
  '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621',
  '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621',
  '\u0627\u0644\u062e\u0645\u064a\u0633',
  '\u0627\u0644\u062c\u0645\u0639\u0629',
  '\u0627\u0644\u0633\u0628\u062a'
];

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
    // Auth check - Vercel sends CRON_SECRET automatically
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    initFirebase();
    const db = getFirestore();
    const qstash = new Client({ token: process.env.QSTASH_TOKEN || '' });

    // Get current day in Saudi timezone (UTC+3)
    const nowUTC = new Date();
    const nowSaudi = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
    const todayDayOfWeek = nowSaudi.getUTCDay(); // 0=Sun...6=Sat
    const todayDateStr = nowSaudi.toISOString().slice(0, 10); // YYYY-MM-DD

    const executeUrl = `https://${req.headers.host}/api/tasks/execute`;

    // Get all users with FCM tokens
    const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();

    let totalScheduled = 0;
    let totalUsers = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      totalUsers++;
      const uid = userDoc.id;

      // Get all subjects for this user
      const subjectsSnap = await db
        .collection('users').doc(uid)
        .collection('subjects').get();

      const todaysLectures: Array<{ name: string; startTime: string; location?: string }> = [];

      for (const subDoc of subjectsSnap.docs) {
        const subject = subDoc.data();
        const lectures: any[] = subject.lectures || [];

        for (const lec of lectures) {
          if (lec.dayOfWeek !== todayDayOfWeek) continue;
          if (!lec.startTime) continue;

          // Parse startTime (HH:MM) as Saudi time
          const [hourStr, minStr] = lec.startTime.split(':');
          const lecHour = parseInt(hourStr, 10);
          const lecMin = parseInt(minStr, 10);

          if (isNaN(lecHour) || isNaN(lecMin)) continue;

          // Build the Saudi datetime for lecture start
          const lecSaudiMs =
            new Date(`${todayDateStr}T00:00:00Z`).getTime() +
            (lecHour * 60 + lecMin) * 60 * 1000;

          // Notify 10 minutes before (subtract 10 min + convert from Saudi to UTC offset already baked in)
          const notifyAtSaudiMs = lecSaudiMs - 10 * 60 * 1000;

          // Convert to UTC unix seconds for QStash notBefore
          // Saudi time is UTC+3, so UTC = Saudi - 3h
          const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
          const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);
          const nowUnixSec = Math.floor(Date.now() / 1000);

          // Only schedule if it's in the future (at least 1 min away)
          if (notifyAtUnixSec <= nowUnixSec + 60) continue;

          todaysLectures.push({
            name: subject.name,
            startTime: lec.startTime,
            location: lec.location,
          });

          // Schedule one-time QStash message (NOT a schedule - no quota limit!)
          await qstash.publishJSON({
            url: executeUrl,
            body: {
              fcmToken,
              title: `\u062a\u0630\u0643\u064a\u0631 \u0628\u0645\u062d\u0627\u0636\u0631\u0629 \uD83D\uDD14`,
              body: `\u0645\u062d\u0627\u0636\u0631\u0629 "${subject.name}" \u0633\u062a\u0628\u062f\u0623 \u0628\u0639\u062f 10 \u062f\u0642\u0627\u0626\u0642!${lec.location ? ' \u0642\u0627\u0639\u0629: ' + lec.location : ''}`,
            },
            notBefore: notifyAtUnixSec,
          });

          totalScheduled++;
        }
      }

      // Also send a summary morning notification if user has lectures today
      if (todaysLectures.length > 0) {
        const lectureList = todaysLectures
          .map(l => `${l.name} (${l.startTime})`)
          .join(', ');

        const summaryMsg = getMessaging();
        await summaryMsg.send({
          token: fcmToken,
          notification: {
            title: `\u0635\u0628\u0627\u062d\u0643 \u0646\u0634\u0627\u0637! \u0644\u062f\u064a\u0643 \u0627\u0644\u064a\u0648\u0645 ${todaysLectures.length} \u0645\u062d\u0627\u0636\u0631\u0629 \uD83D\uDCDA`,
            body: lectureList,
          },
        }).catch(e => console.error('FCM summary error:', e));
      }
    }

    return res.status(200).json({
      success: true,
      usersProcessed: totalUsers,
      lectureNotificationsScheduled: totalScheduled,
      day: DAY_NAMES[todayDayOfWeek],
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
