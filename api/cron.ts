import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { Client } from '@upstash/qstash';

// Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
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
    const messaging = getMessaging();
    const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;

    // Get current day in Saudi timezone (UTC+3)
    const nowUTC = new Date();
    const nowSaudi = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
    const todayDayOfWeek = nowSaudi.getUTCDay(); // 0=Sun...6=Sat
    const todayDateStr = nowSaudi.toISOString().slice(0, 10); // YYYY-MM-DD
    const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
    // Today's boundaries in UTC ms
    const todayStartUTC = saudiMidnightUTC - 3 * 60 * 60 * 1000; // Saudi midnight → UTC
    const todayEndUTC = todayStartUTC + 24 * 60 * 60 * 1000;

    const publicHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
      || process.env.VERCEL_URL
      || (req.headers.host && !req.headers.host.includes('localhost') ? req.headers.host : null)
      || req.headers['x-forwarded-host']
      || req.headers.host;
    const executeUrl = `https://${publicHost}/api/tasks/execute`;
    const nowUnixSec = Math.floor(Date.now() / 1000);

    // Get all users with FCM tokens
    const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();

    let totalDirectLecturesSent = 0;
    let totalScheduled = 0;
    let totalUsers = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      totalUsers++;
      const uid = userDoc.id;

      // ── 1. LECTURES FOR TODAY ────────────────────────────────────────────────
      const subjectsSnap = await db
        .collection('users').doc(uid)
        .collection('subjects').get();

      const todayLectures: Array<{ name: string; startTime: string; location?: string }> = [];

      for (const subDoc of subjectsSnap.docs) {
        const subject = subDoc.data();
        const lectures: any[] = subject.lectures || [];

        for (const lec of lectures) {
          if (lec.dayOfWeek !== todayDayOfWeek) continue;
          if (!lec.startTime) continue;

          todayLectures.push({
            name: subject.name || 'محاضرة',
            startTime: lec.startTime,
            location: lec.location,
          });

          // Schedule individual 10-minute warning via QStash
          if (qstash) {
            const [hourStr, minStr] = lec.startTime.split(':');
            const lecHour = parseInt(hourStr, 10);
            const lecMin = parseInt(minStr, 10);
            if (isNaN(lecHour) || isNaN(lecMin)) continue;

            const lecSaudiMs =
              new Date(`${todayDateStr}T00:00:00Z`).getTime() +
              (lecHour * 60 + lecMin) * 60 * 1000;
            const notifyAtSaudiMs = lecSaudiMs - 10 * 60 * 1000;
            const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
            const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

            if (notifyAtUnixSec > nowUnixSec + 60) {
              const deduplicationId = `lec-${subDoc.id}-${todayDayOfWeek}-${todayDateStr}-${lec.startTime}`;
              try {
                await qstash.publishJSON({
                  url: executeUrl,
                  body: {
                    fcmToken,
                    title: '⏰ محاضرة قريبة!',
                    body: `📚 ${subject.name} بعد 10 دقائق${lec.location ? ' 📍 ' + lec.location : ''} • استعد الآن!`,
                  },
                  notBefore: notifyAtUnixSec,
                  headers: {
                    'Upstash-Deduplication-Id': deduplicationId,
                  },
                });
                totalScheduled++;
              } catch (qErr) {
                console.warn('[cron.ts] QStash schedule warning for lecture:', qErr);
              }
            }
          }
        }
      }

      // ── DIRECT MORNING LECTURES NOTIFICATION (Guaranteed Delivery like tasks) ──
      // Send a direct morning notification summarizing all today's lectures
      if (todayLectures.length > 0) {
        todayLectures.sort((a, b) => a.startTime.localeCompare(b.startTime));
        const count = todayLectures.length;
        const summary = todayLectures.map(l => `${l.name} (${l.startTime})`).join(' • ');
        const dayName = DAY_NAMES[todayDayOfWeek];

        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: `📚 جدول محاضرات اليوم (${dayName}) 🎓`,
              body: `لديك ${count} ${count === 1 ? 'محاضرة' : 'محاضرات'} اليوم: ${summary} ⏰`,
            },
            data: {
              title: `📚 جدول محاضرات اليوم (${dayName}) 🎓`,
              body: `لديك ${count} ${count === 1 ? 'محاضرة' : 'محاضرات'} اليوم: ${summary} ⏰`,
            },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                title: `📚 جدول محاضرات اليوم (${dayName}) 🎓`,
                body: `لديك ${count} ${count === 1 ? 'محاضرة' : 'محاضرات'} اليوم: ${summary} ⏰`,
                icon: '/icon-v2-192.png',
                badge: '/icon-v2-192.png',
              },
            },
          });
          totalDirectLecturesSent++;
          console.log(`[cron.ts] Sent direct morning lecture overview to user ${uid}`);
        } catch (fcmErr) {
          console.error(`[cron.ts] Failed to send direct morning lectures notification to user ${uid}:`, fcmErr);
        }
      }

      // ── 2. CALENDAR EVENTS FOR TODAY ─────────────────────────────────────────
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

        if (qstash) {
          const deduplicationId = `event-${evDoc.id}-${todayDateStr}`;
          try {
            await qstash.publishJSON({
              url: executeUrl,
              body: {
                fcmToken,
                title: '📅 حدث قريب!',
                body: `⏰ ${ev.title} بعد 10 دقائق${ev.location ? ' 📍 ' + ev.location : ''} • لا تفوتك!`,
              },
              notBefore: notifyAtUnixSec,
              headers: {
                'Upstash-Deduplication-Id': deduplicationId,
              },
            });
            totalScheduled++;
          } catch (qErr) {
            console.warn('[cron.ts] QStash schedule warning for event:', qErr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      usersProcessed: totalUsers,
      directMorningLecturesSent: totalDirectLecturesSent,
      totalNotificationsScheduled: totalScheduled,
      day: DAY_NAMES[todayDayOfWeek],
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
