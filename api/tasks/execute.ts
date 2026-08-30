import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

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