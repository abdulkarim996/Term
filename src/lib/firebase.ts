import { getMessaging, isSupported } from 'firebase/messaging';
// @ts-nocheck
﻿import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCBZ-ZhKJEkPzZ3voDMtEkN894AISjlJh0",
  authDomain: "student-dashboard-6e0c1.firebaseapp.com",
  projectId: "student-dashboard-6e0c1",
  storageBucket: "student-dashboard-6e0c1.firebasestorage.app",
  messagingSenderId: "599529502181",
  appId: "1:599529502181:web:ba06c38f6212ce37a76b0c"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(console.error)

export const db_cloud = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
export const googleProvider = new GoogleAuthProvider()


export const getAppMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn("Firebase Messaging is not supported in this browser/environment.", e);
  }
  return null;
};
