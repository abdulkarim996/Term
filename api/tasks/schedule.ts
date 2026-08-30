import { Client } from '@upstash/qstash';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const client = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { title, body, uid, isRecurring, notBefore, cron } = req.body;
  if (!uid || !title) return res.status(400).json({ error: 'Missing fields' });

  // 1. Initialize Firebase to get FCM Token (1 read during scheduling only)
  if (getApps().length === 0) {
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    } else if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
    }


    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }

  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (!fcmToken) {
    return res.status(200).json({ error: 'No fcmToken found for user, skipped scheduling.' });
  }

  const destination = `https://${req.headers.host}/api/tasks/execute`;
  const payload = { title, body, fcmToken };

  try {
    if (isRecurring && cron) {
      const resQ = await client.schedules.create({
        destination,
        cron,
        body: JSON.stringify(payload),
      });
      return res.status(200).json({ id: resQ.scheduleId });
    } else if (!isRecurring && notBefore) {
      const resQ = await client.publishJSON({
        url: destination,
        body: payload,
        notBefore,
      });
      return res.status(200).json({ id: resQ.messageId });
    } else {
      return res.status(400).json({ error: 'Missing schedule timing parameters' });
    }
  } catch (e) {
    console.error('QStash Error:', e);
    return res.status(500).json({ error: e.message });
  }
}