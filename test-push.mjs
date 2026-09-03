import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
  }),
});

async function sendTest() {
  const db = getFirestore();
  const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
  
  if (usersSnap.empty) {
    console.log("No users with fcmToken found.");
    return;
  }

  for (const doc of usersSnap.docs) {
    const fcmToken = doc.data().fcmToken;
    console.log(`Sending to ${doc.id}...`);
    try {
      const response = await getMessaging().send({
        token: fcmToken,
        notification: {
          title: "تجربة من Antigravity 🚀",
          body: "أهلاً! هذا إشعار تجريبي للتأكد من أن نظام الإشعارات يعمل بشكل ممتاز على جهازك."
        }
      });
      console.log('Success:', response);
    } catch (e) {
      console.error('Error sending:', e);
    }
  }
}

sendTest();