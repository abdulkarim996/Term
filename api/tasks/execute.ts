import { Receiver } from '@upstash/qstash';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. Verify QStash Signature
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
  });

  const signature = req.headers['upstash-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing Upstash Signature' });
  }

  // Next.js/Vercel handles body parsing. We need to verify the raw body if it was raw, 
  // but receiver.verify accepts the parsed JSON body if we stringify it.
  // Actually, QStash receiver.verify expects a string body or Buffer.
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  try {
    const isValid = await receiver.verify({
      signature: signature,
      body: rawBody,
    });
    if (!isValid) throw new Error('Invalid signature');
  } catch (error) {
    console.error('QStash Verification Failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Initialize Firebase
  if (getApps().length === 0) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey.startsWith('\"')) privateKey = JSON.parse(privateKey);

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }

  const msg = getMessaging();
  const { fcmToken, title, body } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  if (!fcmToken) return res.status(400).json({ error: 'Missing fcmToken' });

  // 3. Send Notification
  try {
    const response = await msg.send({
      token: fcmToken,
      notification: { title, body },
    });
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('FCM Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
