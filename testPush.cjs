const fs = require('fs');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch(e) {
        value = value.slice(1, -1);
      }
    }
    process.env[key] = value;
  }
});

function formatPEM(rawKey) {
  let keyData = rawKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const chunks = keyData.match(/.{1,64}/g);
  if (!chunks) return rawKey;
  return '-----BEGIN PRIVATE KEY-----\n' + chunks.join('\n') + '\n-----END PRIVATE KEY-----\n';
}

async function runTest() {
  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    if (!privateKey || privateKey.includes('ضع مفتاحك')) {
      console.log('❌ خطأ: لم يتم وضع الـ Private Key الحقيقي في ملف .env.local بعد.');
      return;
    }

    privateKey = formatPEM(privateKey);

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }

    const db = getFirestore();
    const messaging = getMessaging();

    console.log('✅ تم الاتصال بـ Firebase Admin بنجاح. جاري البحث عن مستخدم لديه FCM Token...');

    const usersSnap = await db.collection('users').get();
    let targetToken = null;
    let targetUid = null;

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.fcmToken) {
        targetToken = data.fcmToken;
        targetUid = doc.id;
        break; 
      }
    }

    if (!targetToken) {
      console.log('⚠️ لم يتم العثور على أي مستخدم قام بتفعيل الإشعارات (لا يوجد fcmToken).');
      console.log('يرجى فتح التطبيق، وتفعيل الإشعارات من صفحة الإعدادات أولاً.');
      return;
    }

    console.log(`✅ تم العثور على Token للمستخدم (${targetUid}). جاري إرسال الإشعار...`);

    const response = await messaging.send({
      token: targetToken,
      notification: {
        title: 'تجربة الإشعارات 🚀',
        body: 'إذا وصلك هذا الإشعار، فإن النظام الخارجي يعمل بنجاح!'
      }
    });

    console.log('🎉 تمت عملية الإرسال بنجاح!');
    console.log('رقم الاستجابة (Message ID):', response);

  } catch (error) {
    console.error('❌ حدث خطأ أثناء الإرسال:', error);
  }
}

runTest();
