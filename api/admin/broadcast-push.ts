import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const SUPER_ADMIN_EMAIL = 'kromsa2006@gmail.com';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    initFirebase();
    const db = getFirestore();
    const auth = getAuth();
    const messaging = getMessaging();

    // 1. Authenticate Super Admin via Bearer ID Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let decodedToken: any;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (e: any) {
      return res.status(401).json({ error: 'Invalid authentication token: ' + e.message });
    }

    if (decodedToken.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Access restricted to Super Admin only' });
    }

    // 2. Parse payload
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { target, targetUid, title, body: messageBody, url } = body;

    if (!title || !messageBody) {
      return res.status(400).json({ error: 'Title and message body are required' });
    }

    // 3. Resolve target tokens
    let tokens: string[] = [];
    let recipientNames: string[] = [];

    if (target === 'all') {
      const usersSnap = await db.collection('users').get();
      usersSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data?.fcmToken && typeof data.fcmToken === 'string') {
          tokens.push(data.fcmToken);
          recipientNames.push(data.displayName || data.email || doc.id);
        }
      });
    } else if (targetUid) {
      const userDoc = await db.collection('users').doc(targetUid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.fcmToken && typeof data.fcmToken === 'string') {
          tokens.push(data.fcmToken);
          recipientNames.push(data.displayName || data.email || userDoc.id);
        }
      }
    }

    if (tokens.length === 0) {
      return res.status(200).json({
        success: false,
        deliveredCount: 0,
        message: 'No registered devices with Push Notifications enabled found for this target.',
      });
    }

    // 4. Send FCM messages in batches
    // Deduplicate tokens
    const uniqueTokens = Array.from(new Set(tokens));
    let successCount = 0;
    let failureCount = 0;

    const batches: string[][] = [];
    const batchSize = 500;
    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
      batches.push(uniqueTokens.slice(i, i + batchSize));
    }

    for (const tokenBatch of batches) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: tokenBatch,
          notification: {
            title,
            body: messageBody,
          },
          webpush: {
            headers: {
              Urgency: 'high',
            },
            notification: {
              title,
              body: messageBody,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/badge-72x72.png',
              vibrate: [200, 100, 200],
            },
            fcmOptions: {
              link: url || 'https://term-app.web.app',
            },
          },
        });
        successCount += response.successCount;
        failureCount += response.failureCount;
      } catch (sendErr: any) {
        console.error('Multicast error:', sendErr);
        failureCount += tokenBatch.length;
      }
    }

    // 5. Save record into Broadcast History in Firestore
    try {
      await db.collection('system_broadcasts').add({
        title,
        body: messageBody,
        target: target === 'all' ? 'all' : targetUid,
        recipientSummary: target === 'all' ? `جميع الطلاب (${uniqueTokens.length})` : recipientNames[0] || targetUid,
        tokensTargeted: uniqueTokens.length,
        successCount,
        failureCount,
        sentAt: Date.now(),
        sentBy: SUPER_ADMIN_EMAIL,
      });
    } catch (dbErr) {
      console.warn('Failed to record broadcast history:', dbErr);
    }

    return res.status(200).json({
      success: true,
      deliveredCount: successCount,
      failureCount,
      totalDevices: uniqueTokens.length,
      message: `Successfully dispatched to ${successCount} device(s).`,
    });
  } catch (error: any) {
    console.error('Broadcast push error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
