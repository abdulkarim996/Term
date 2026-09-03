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
    const { uid, eventId, eventTitle, startDate, location } = bodyObj;

    if (!uid || !eventId || !startDate) {
      return res.status(400).json({ error: 'Missing required fields: uid, eventId, startDate' });
    }

    // --- Timezone Safety: Evaluate "today" strictly in Asia/Riyadh (UTC+3) ---
    const nowUTC = Date.now();
    const nowSaudiMs = nowUTC + 3 * 60 * 60 * 1000;
    const todayDateStr = new Date(nowSaudiMs).toISOString().slice(0, 10); // YYYY-MM-DD (Saudi)
    const nowUnixSec = Math.floor(nowUTC / 1000);

    // --- Eligibility: startDate must be TODAY (Saudi) and still in the future ---
    const startMs = typeof startDate === 'number' ? startDate : Number(startDate);

    // Convert startDate (UTC ms) to Saudi date string
    const startSaudiMs = startMs + 3 * 60 * 60 * 1000;
    const startDateStr = new Date(startSaudiMs).toISOString().slice(0, 10);

    if (startDateStr !== todayDateStr) {
      return res.status(200).json({ success: true, scheduled: 0, reason: 'Event is not today' });
    }

    const notifyAtUTCMs = startMs - 10 * 60 * 1000;
    const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);

    if (notifyAtUnixSec <= nowUnixSec + 60) {
      return res.status(200).json({ success: true, scheduled: 0, reason: 'Less than 11 minutes away' });
    }

    // --- Fetch FCM token for this user ---
    const userDoc = await db.collection('users').doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) {
      return res.status(200).json({ success: true, scheduled: 0, reason: 'No FCM token' });
    }

    const executeUrl = `https://${req.headers.host}/api/tasks/execute`;

    // --- Deduplication: unique per event + calendar date ---
    const deduplicationId = `event-${eventId}-${todayDateStr}`;

    await qstash.publishJSON({
      url: executeUrl,
      body: {
        fcmToken,
        title: '\uD83D\uDCC5 \u062d\u062f\u062b \u0642\u0631\u064a\u0628!',
        body: `\u23f0 ${eventTitle} \u0628\u0639\u062f 10 \u062f\u0642\u0627\u0626\u0642${location ? ' \uD83D\uDCCD ' + location : ''} \u2022 \u0644\u0627 \u062a\u0641\u0648\u062a\u0643!`,
      },
      notBefore: notifyAtUnixSec,
      headers: {
        'Upstash-Deduplication-Id': deduplicationId,
      },
    });

    return res.status(200).json({ success: true, scheduled: 1, date: todayDateStr });

  } catch (error: any) {
    console.error('schedule-today-event error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}