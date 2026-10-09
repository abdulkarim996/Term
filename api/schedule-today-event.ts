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

    const publicHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
      || process.env.VERCEL_URL
      || (req.headers.host && !req.headers.host.includes('localhost') ? req.headers.host : null)
      || req.headers['x-forwarded-host']
      || req.headers.host;
    const executeUrl = `https://${publicHost}/api/tasks/execute`;

    // --- Deduplication: unique per event + calendar date ---
    const deduplicationId = `event-${eventId}-${todayDateStr}`;

    try {
      await qstash.publishJSON({
        url: executeUrl,
        body: {
          fcmToken,
          title: '📅 حدث قريب!',
          body: `⏰ ${eventTitle} بعد 10 دقائق${location ? ' 📍 ' + location : ''} • لا تفوتك!`,
        },
        notBefore: notifyAtUnixSec,
        headers: {
          'Upstash-Deduplication-Id': deduplicationId,
        },
      });
      return res.status(200).json({ success: true, scheduled: 1, date: todayDateStr });
    } catch (err) {
      console.warn('[schedule-today-event] QStash publish warning:', err);
      return res.status(200).json({ success: false, reason: 'QStash publish warning' });
    }

  } catch (error: any) {
    console.error('schedule-today-event error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}