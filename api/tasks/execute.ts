import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Receiver } from '@upstash/qstash';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const signature = req.headers['upstash-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const isValid = await receiver.verify({
      signature: signature as string,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 1. Initialize Firebase
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

    // 2. Parse Body safely
    const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { fcmToken, title, body } = bodyObj;

    if (!fcmToken) return res.status(400).json({ error: 'Missing fcmToken' });

    // 3. Send Notification
    const msg = getMessaging();
    const response = await msg.send({
      token: fcmToken,
      notification: { title, body },
    });
    
    return res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Global Error in execute.ts:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}