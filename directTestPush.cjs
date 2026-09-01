const fs = require('fs');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = {
  "type": "service_account",
  "project_id": "student-dashboard-6e0c1",
  "private_key_id": "97451b7af384cc0da6ebfb6cc5f6edd406275763",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDP99U/FcVoQMxM\nj79GHnV5DN5xESsvUBPxzUsAWklbC0ozsYZN3VPWlqQtErYUv8dmPMPpT9VILdUt\nsof+6q0NBmOyNZLDwrN8r+bEslOVoUhhQYHpBpcVD7BZ0I3cb16J2UvGh4m9JssA\nUZjRC7sq8xWyxaVpABCiAw0kny+DCWcXQ+qRm/Mbj0xuUblp3oCe5f3m2q9obC/u\n0rPZbfkKp+6tBkLYl6m/Llr0SZT0BI2loAdyGYiGGnAjbeRm4scDyfaM5Gw2Jfsf\ndoxNUJNZjAjtyGF5tkQkru9lS0jn54jeOjNwFETffjWdGMgfwL7Nn71VAcuREOuM\n53A9NlZhAgMBAAECggEAClS6m5DbTTVOCmebQUJ2F3aG/k4aCEmnRy9cw6TrvygU\nBML6DWT3RNIXtpCwlt57OB4nC7Bsw4WM8RSZvBVJ726BbIx/JyMrtpmOXysOPk3U\nW9bc1NSZxyQP+jlpmQ+3PiXOcj6wnilB+fJ6IuuJ3ei7C5xusR6dtOg6soNt4TAM\npLBRqL/itDsW6Mn9MwEjAff1kFADJodSTg+gmxvtduHvs2PHHoHIjhh9NlSl+RA7\n0lhnKIWUuMmqHUgbrIbGyANpSXsG6d7cvdCtZf1b6XSNP2JpHrhj61JPmdgPNz8c\n4nZsMhDn19/26lAJAEeR3yZNehHBxAPPh2Oe40WPWQKBgQDwrbPa3+4b5SBP8cxi\nMGspIgR3x1fw9VSSkTmrlAnTAPPEVBmIxArDOzRYyKnN3NQF+W/0M3GQo0yj8Dny\nAK1ibaGLKKwEWyvcdvjRoNm+T3wrhkeOC+NhwWOarfMEymwdDQmGhaK8pLH2SccA\nkMK4TI54xYVAsyPb9wheo+BmiwKBgQDdNQ3ZEdY0/3AHaQsdBS4MeopPBtJVAaJC\nUykZi0U3VibEfbQSEJRFe69kbfhz4yY033iFKNUJqN4dLmeMwSsJRyGuORKpda7V\nuiaaGSu6ngOjGDRSoeLoIpOJ3EQ1s31MTXxlKdR98ifHHq+YqwkNvqvP/vyKKVJo\nkUBtT2KAQwKBgQDtQ2A90mmqaDttdEJ3PaI2n4lmB0eDjGa+Qppmsf7pW1P0ZK/z\nasftZM0bBV6YSi1eYmNiiuBWpRVlu+lz0AUdNlR9mi/R74sSwNpT1c0yVqtjQPID\nb2bONNabYwZi36arEPImAlHGxFmIIX0j6pF7HEWLe7T8bl1YeHRwz/7lNwKBgQCP\nAvfa+N8mEGbbQ5w9vNWSl77HbL+a2Z2Ph7gwnYu4ROh3bFV4wGM7sMUqBrb0JUzU\nLg36+PUSc6x17URhCZnLO8OYoalhCYZpAxpl0hQlaHctgD6DlcnfDkuYe2FV3p8J\nL6dWt/57Fo2E/F/GMf1+d2EY7d9Ta3etxwqCISqrhQKBgQDihUGZEEYi9RkbBb5C\nMgX2z9B6QpkoNUkuSirHTPZ0Bn1yn+Sp2WZe42lcsLMzip2xywYePZOhJVJ/H87F\nu15/bUufHQjlH7nNgtKfDW2rYCZLp1/4NhBESWNit5MjLBLWbZNUk1m50d2cHXW3\nDm1nRriQLKtT7xgWoBFL18Gnzg==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@student-dashboard-6e0c1.iam.gserviceaccount.com"
};

const envContent = 'FIREBASE_PROJECT_ID="' + serviceAccount.project_id + '"\n' +
'FIREBASE_CLIENT_EMAIL="' + serviceAccount.client_email + '"\n' +
'FIREBASE_PRIVATE_KEY=' + JSON.stringify(serviceAccount.private_key) + '\n' +
'CRON_SECRET="MySuperSecretCronJob2026"\n';

fs.writeFileSync('.env.local', envContent);
console.log('Saved properly to .env.local!');

// Fix api/cron.ts key parsing logic since we are now guaranteeing JSON format
let cronContent = fs.readFileSync('api/cron.ts', 'utf8');
// Strip out any formatPEM hacks, just use JSON.parse gracefully
cronContent = cronContent.replace(/privateKey: formatPEM\(\(process\.env\.FIREBASE_PRIVATE_KEY \|\| ''\)\.replace\(\/\\\\n\/g, '\\n'\)\)/g, 'privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").startsWith("\\"") ? JSON.parse(process.env.FIREBASE_PRIVATE_KEY) : (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\\\n/g, "\\n")');
fs.writeFileSync('api/cron.ts', cronContent);

async function testDirect() {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount)
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
      console.log('⚠️ لم يتم العثور على أي مستخدم قام بتفعيل الإشعارات.');
      return;
    }

    console.log('✅ تم العثور على Token للمستخدم (' + targetUid + '). جاري إرسال الإشعار...');

    const response = await messaging.send({
      token: targetToken,
      notification: {
        title: 'تجربة الإشعارات 🚀',
        body: 'إذا وصلك هذا الإشعار، فإن النظام الخارجي يعمل بنجاح!'
      }
    });

    console.log('🎉 تمت عملية الإرسال بنجاح!');
    console.log('رقم الاستجابة (Message ID): ' + response);
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
  }
}

testDirect();
