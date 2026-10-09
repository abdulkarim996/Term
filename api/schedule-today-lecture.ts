import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Client } from '@upstash/qstash';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    initFirebase();
    const db = getFirestore();
    const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;
    if (!qstash) {
      return res.status(200).json({ success: true, scheduled: 0, reason: 'QSTASH_TOKEN not configured' });
    }

    const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { uid, subjectId, subjectName, lectures, location } = bodyObj;

    if (!uid || !subjectId || !lectures || !Array.isArray(lectures)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- Timezone Safety: Evaluate "today" strictly in Asia/Riyadh (UTC+3) ---
    const nowUTC = Date.now();
    const nowSaudiMs = nowUTC + 3 * 60 * 60 * 1000;
    const nowSaudiDate = new Date(nowSaudiMs);
    const todayDayOfWeek = nowSaudiDate.getUTCDay(); // 0=Sun ... 6=Sat
    const todayDateStr = nowSaudiDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const nowUnixSec = Math.floor(nowUTC / 1000);

    // --- Fetch FCM token for this user ---
    const userDoc = await db.collection('users').doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) {
      return res.status(200).json({ success: true, scheduled: 0, reason: 'No FCM token' });
    }

    const publicHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
      || process.env.VERCEL_URL
      || (req.headers.host && !req.headers.host.includes('localhost') ? req.headers.host : null)
      || req.headers['x-forwarded-host']
      || req.headers.host;
    const executeUrl = `https://${publicHost}/api/tasks/execute`;
    let scheduledCount = 0;

    for (const lec of lectures) {
      // --- Eligibility Check: Must be TODAY and in the FUTURE ---
      if (lec.dayOfWeek !== todayDayOfWeek) continue;
      if (!lec.startTime) continue;

      const [hourStr, minStr] = lec.startTime.split(':');
      const lecHour = parseInt(hourStr, 10);
      const lecMin = parseInt(minStr, 10);
      if (isNaN(lecHour) || isNaN(lecMin)) continue;

      const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
      const lecStartSaudiMs = saudiMidnightUTC + (lecHour * 60 + lecMin) * 60 * 1000;
      const notifyAtSaudiMs = lecStartSaudiMs - 10 * 60 * 1000;
      const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
      const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

      // Must still be at least 60s in the future
      if (notifyAtUnixSec <= nowUnixSec + 60) continue;

      const deduplicationId = `${subjectId}-dow${todayDayOfWeek}-${todayDateStr}-${lec.startTime}`;

      try {
        await qstash.publishJSON({
          url: executeUrl,
          body: {
            fcmToken,
            title: '⏰ محاضرة قريبة!',
            body: `📚 ${subjectName} بعد 10 دقائق${lec.location ? ' 📍 ' + lec.location : (location ? ' 📍 ' + location : '')} • استعد الآن!`,
          },
          notBefore: notifyAtUnixSec,
          headers: {
            'Upstash-Deduplication-Id': deduplicationId,
          },
        });
        scheduledCount++;
      } catch (err) {
        console.warn('[schedule-today-lecture] QStash publish warning:', err);
      }
    }

    return res.status(200).json({ success: true, scheduled: scheduledCount, date: todayDateStr });

  } catch (error: any) {
    console.error('schedule-today-lecture error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}