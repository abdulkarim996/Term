import { Client } from '@upstash/qstash';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const client = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

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
    try {
      await getAuth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { id, isRecurring } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    if (isRecurring) {
      await client.schedules.delete(id);
    } else {
      await client.messages.delete(id);
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Global Error in cancel.ts:', error);
    return res.status(200).json({ success: true, note: 'Error ignored' });
  }
}