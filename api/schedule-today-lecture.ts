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
    const qstash = new Client({ token: process.env.QSTASH_TOKEN || '' });

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

    const executeUrl = `https://${req.headers.host}/api/tasks/execute`;
    let scheduledCount = 0;

    for (const lec of lectures) {
      // --- Eligibility Check: Must be TODAY and in the FUTURE ---
      if (lec.dayOfWeek !== todayDayOfWeek) continue;
      if (!lec.startTime) continue;

      const [hourStr, minStr] = lec.startTime.split(':');
      const lecHour = parseInt(hourStr, 10);
      const lecMin = parseInt(minStr, 10);
      if (isNaN(lecHour) || isNaN(lecMin)) continue;

      // Build Saudi lecture start time as UTC ms
      // todayDateStr is "YYYY-MM-DD" in Saudi local time; midnight UTC of that date needs +3h offset applied in reverse
      // The cron uses: new Date(`${todayDateStr}T00:00:00Z`).getTime() + lecMins * 60000
      // That is Saudi-midnight in UTC. This is correct because todayDateStr was derived from nowSaudiMs.
      const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
      const lecStartSaudiMs = saudiMidnightUTC + (lecHour * 60 + lecMin) * 60 * 1000;
      const notifyAtSaudiMs = lecStartSaudiMs - 10 * 60 * 1000;
      // Convert notify time to true UTC (subtract +3h offset)
      const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
      const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

      // Must still be at least 60s in the future
      if (notifyAtUnixSec <= nowUnixSec + 60) continue;

      // --- Deduplication: unique per subject + day + calendar date ---
      const deduplicationId = `${subjectId}-dow${todayDayOfWeek}-${todayDateStr}`;

      await qstash.publishJSON({
        url: executeUrl,
        body: {
          fcmToken,
          title: '\u23f0 \u0645\u062d\u0627\u0636\u0631\u0629 \u0642\u0631\u064a\u0628\u0629!',
          body: `\uD83D\uDCDA ${subjectName} \u0628\u0639\u062f 10 \u062f\u0642\u0627\u0626\u0642${lec.location ? ' \uD83D\uDCCD ' + lec.location : (location ? ' \uD83D\uDCCD ' + location : '')} \u2022 \u0627\u0633\u062a\u0639\u062f \u0627\u0644\u0622\u0646!`,
        },
        notBefore: notifyAtUnixSec,
        headers: {
          'Upstash-Deduplication-Id': deduplicationId,
        },
      });

      scheduledCount++;
    }

    return res.status(200).json({ success: true, scheduled: scheduledCount, date: todayDateStr });

  } catch (error: any) {
    console.error('schedule-today-lecture error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}