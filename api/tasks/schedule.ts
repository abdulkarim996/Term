import { Client } from '@upstash/qstash';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const client = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export default async function handler(req, res) {
  try {
    console.log('--- SCHEDULE API CALLED ---', req.method);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { title, body, uid, isRecurring, notBefore, cron } = req.body;
    console.log('Payload:', { title, body, uid, isRecurring, notBefore, cron });

    if (!uid || !title) {
      console.error('Missing fields in schedule payload');
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (getApps().length === 0) {
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

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (uid !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sanitize = (str: any) => typeof str === 'string' ? str.replace(/[<>]/g, '') : str;
    const sTitle = sanitize(title);
    const sBody = sanitize(body);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;
    console.log('FCM Token found for user:', !!fcmToken);

    if (!fcmToken) {
      return res.status(200).json({ error: 'No fcmToken found for user, skipped scheduling.' });
    }

    const destination = `https://${req.headers.host}/api/tasks/execute`;
    const payload = { title: sTitle, body: sBody, fcmToken };
    console.log('QStash Destination:', destination);

    if (isRecurring && cron) {
      console.log('Creating QStash Schedule with Cron:', cron);
      const resQ = await client.schedules.create({
        destination,
        cron,
        body: JSON.stringify(payload),
      });
      console.log('QStash Schedule ID:', resQ.scheduleId);
      return res.status(200).json({ id: resQ.scheduleId });
    } else if (!isRecurring && notBefore) {
      console.log('Creating QStash One-off Message');
      const resQ = await client.publishJSON({
        url: destination,
        body: payload,
        notBefore,
      });
      return res.status(200).json({ id: resQ.messageId });
    } else {
      console.error('Missing schedule timing parameters');
      return res.status(400).json({ error: 'Missing schedule timing parameters' });
    }
  } catch (error: any) {
    console.error('Global Error in schedule.ts:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}