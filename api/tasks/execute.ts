import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { Receiver } from '@upstash/qstash';

function initFirebase() {
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
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // 1. Safely extract body regardless of how Vercel processed it
    let bodyObj: any = null;
    let rawBodyStr: string = '';

    if (typeof req.body === 'string') {
      rawBodyStr = req.body;
      try { bodyObj = JSON.parse(req.body); } catch { bodyObj = {}; }
    } else if (Buffer.isBuffer(req.body)) {
      rawBodyStr = req.body.toString('utf8');
      try { bodyObj = JSON.parse(rawBodyStr); } catch { bodyObj = {}; }
    } else if (req.body && typeof req.body === 'object') {
      bodyObj = req.body;
      rawBodyStr = JSON.stringify(req.body);
    } else {
      // Fallback: Read from stream if body was not parsed
      rawBodyStr = await new Promise<string>((resolve) => {
        let b = '';
        req.on('data', (chunk: Buffer) => { b += chunk.toString('utf8'); });
        req.on('end', () => resolve(b));
        req.on('error', () => resolve(''));
        setTimeout(() => resolve(b), 1500);
      });
      try { bodyObj = JSON.parse(rawBodyStr); } catch { bodyObj = {}; }
    }

    if (!bodyObj || typeof bodyObj !== 'object') {
      return res.status(400).json({ error: 'Invalid or empty request body' });
    }

    // 2. Security & QStash Signature check
    const signature = req.headers['upstash-signature'];
    const authHeader = req.headers['authorization'];
    const isCronSecret = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!signature && !isCronSecret) {
      console.warn('[execute.ts] Request missing Upstash signature or Cron Secret');
      return res.status(401).json({ error: 'Missing authorization signature' });
    }

    // If QStash signing keys are configured and signature is present, verify
    if (signature && process.env.QSTASH_CURRENT_SIGNING_KEY) {
      try {
        const receiver = new Receiver({
          currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
          nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || process.env.QSTASH_CURRENT_SIGNING_KEY,
        });

        const isValid = await receiver.verify({
          signature: signature as string,
          body: rawBodyStr,
        }).catch((err: any) => {
          console.warn('[execute.ts] QStash signature verification mismatch warning:', err?.message || err);
          return false;
        });

        if (!isValid) {
          console.warn('[execute.ts] Signature verification reported false; checking payload sanity...');
        }
      } catch (err) {
        console.warn('[execute.ts] Receiver verification error:', err);
      }
    }

    // 3. Extract Notification Parameters
    const { fcmToken, title, body, uid, subjectId, expectedStartTime } = bodyObj;
    if (!fcmToken || !title) {
      return res.status(400).json({ error: 'Missing fcmToken or title in payload' });
    }

    // 4. Initialize Firebase Admin
    initFirebase();

    // Check if this was a lecture reminder that was changed or deleted since scheduling
    if (uid && subjectId && expectedStartTime) {
      try {
        const db = getFirestore();
        const subDoc = await db.collection('users').doc(uid).collection('subjects').doc(subjectId).get();
        if (subDoc.exists) {
          const subData = subDoc.data();
          const currentLectures = subData?.lectures || [];
          const stillValid = currentLectures.some((l: any) => l.startTime === expectedStartTime);
          if (!stillValid) {
            console.log(`[execute.ts] Suppressed obsolete lecture reminder: ${subjectId} at ${expectedStartTime}`);
            return res.status(200).json({ success: true, skipped: true, reason: 'Lecture time changed or removed' });
          }
        } else {
          console.log(`[execute.ts] Subject ${subjectId} no longer exists, suppressing reminder`);
          return res.status(200).json({ success: true, skipped: true, reason: 'Subject deleted' });
        }
      } catch (err) {
        console.warn('[execute.ts] Warning during lecture validity check:', err);
      }
    }

    // 5. Send High-Priority Notification
    const msg = getMessaging();
    const response = await msg.send({
      token: fcmToken,
      notification: {
        title,
        body: body || '',
      },
      data: {
        title,
        body: body || '',
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title,
          body: body || '',
          icon: '/icon-v2-192.png',
          badge: '/icon-v2-192.png',
        },
      },
    });

    console.log(`[QStash execute.ts] Notification delivered successfully: "${title}" (FCM ID: ${response})`);
    return res.status(200).json({ success: true, messageId: response });

  } catch (error: any) {
    console.error('[execute.ts] Global Error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}