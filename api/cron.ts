import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
    // Today's boundaries in UTC ms
    const todayStartUTC = saudiMidnightUTC - 3 * 60 * 60 * 1000; // Saudi midnight → UTC
    const todayEndUTC = todayStartUTC + 24 * 60 * 60 * 1000;

    const executeUrl = `https://${req.headers.host}/api/tasks/execute`;
    const nowUnixSec = Math.floor(Date.now() / 1000);

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

      // ── 1. LECTURES ──────────────────────────────────────────────────────────
      const subjectsSnap = await db
        .collection('users').doc(uid)
        .collection('subjects').get();

      for (const subDoc of subjectsSnap.docs) {
        const subject = subDoc.data();
        const lectures: any[] = subject.lectures || [];

        for (const lec of lectures) {
          if (lec.dayOfWeek !== todayDayOfWeek) continue;
          if (!lec.startTime) continue;

          const [hourStr, minStr] = lec.startTime.split(':');
          const lecHour = parseInt(hourStr, 10);
          const lecMin = parseInt(minStr, 10);
          if (isNaN(lecHour) || isNaN(lecMin)) continue;

          // Build Saudi datetime for lecture start, then subtract 10 min, convert to UTC
          const lecSaudiMs =
            new Date(`${todayDateStr}T00:00:00Z`).getTime() +
            (lecHour * 60 + lecMin) * 60 * 1000;
          const notifyAtSaudiMs = lecSaudiMs - 10 * 60 * 1000;
          const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
          const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

          if (notifyAtUnixSec <= nowUnixSec + 60) continue;

          await qstash.publishJSON({
            url: executeUrl,
            body: {
              fcmToken,
              title: '\u23f0 \u0645\u062d\u0627\u0636\u0631\u0629 \u0642\u0631\u064a\u0628\u0629!',
              body: `\uD83D\uDCDA ${subject.name} \u0628\u0639\u062f 10 \u062f\u0642\u0627\u0626\u0642${lec.location ? ' \uD83D\uDCCD ' + lec.location : ''} \u2022 \u0627\u0633\u062a\u0639\u062f \u0627\u0644\u0622\u0646!`,
            },
            notBefore: notifyAtUnixSec,
          });

          totalScheduled++;
        }
      }

      // ── 2. CALENDAR EVENTS ───────────────────────────────────────────────────
      const eventsSnap = await db
        .collection('users').doc(uid)
        .collection('events')
        .where('startDate', '>=', todayStartUTC)
        .where('startDate', '<', todayEndUTC)
        .get();

      for (const evDoc of eventsSnap.docs) {
        const ev = evDoc.data();
        if (!ev.startDate) continue;

        const notifyAtUTCMs = ev.startDate - 10 * 60 * 1000;
        const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

        if (notifyAtUnixSec <= nowUnixSec + 60) continue;

        const deduplicationId = `event-${evDoc.id}-${todayDateStr}`;

        await qstash.publishJSON({
          url: executeUrl,
          body: {
            fcmToken,
            title: '\uD83D\uDCC5 \u062d\u062f\u062b \u0642\u0631\u064a\u0628!',
            body: `\u23f0 ${ev.title} \u0628\u0639\u062f 10 \u062f\u0642\u0627\u0626\u0642${ev.location ? ' \uD83D\uDCCD ' + ev.location : ''} \u2022 \u0644\u0627 \u062a\u0641\u0648\u062a\u0643!`,
          },
          notBefore: notifyAtUnixSec,
          headers: {
            'Upstash-Deduplication-Id': deduplicationId,
          },
        });

        totalScheduled++;
      }
    }

    return res.status(200).json({
      success: true,
      usersProcessed: totalUsers,
      totalNotificationsScheduled: totalScheduled,
      day: DAY_NAMES[todayDayOfWeek],
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
