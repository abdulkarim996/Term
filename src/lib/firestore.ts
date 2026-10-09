// @ts-nocheck
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, writeBatch, serverTimestamp,
  Timestamp, getDoc, onSnapshot, addDoc
} from 'firebase/firestore'
import { db_cloud, auth } from './firebase'

export function getUid() { const uid = auth.currentUser?.uid; if (!uid) throw new Error('Not authenticated'); return uid; }

function userCol(uid: string, colName: string) {
  return collection(db_cloud, 'users', uid, colName)
}
function userDoc(uid: string, colName: string, docId: string) {
  return doc(db_cloud, 'users', uid, colName, docId)
}

function clean<T extends object>(obj: T): Partial<T> {
  const cleaned = Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => v !== undefined && k !== 'id' && k !== 'localId' && k !== 'cloudId')
  ) as Partial<T>
  return cleaned
}

export function subscribeToUserData(uid: string, callbacks: any): () => void {
  const unsubs: (() => void)[] = []
  
  const setupListener = (col: string, callback?: (items: any[]) => void) => {
    if (callback) {
      unsubs.push(onSnapshot(collection(db_cloud, 'users', uid, col), (snap) => {
        callback(snap.docs.map(d => ({ ...d.data(), cloudId: d.id })))
      }))
    }
  }

  setupListener('subjects', callbacks.onSubjects)
  setupListener('tasks', callbacks.onTasks)
  setupListener('events', callbacks.onEvents)
  setupListener('driveFiles', callbacks.onDriveFiles)
  setupListener('chatSessions', callbacks.onChatSessions)
  setupListener('chatMessages', callbacks.onChatMessages)
  setupListener('semesters', callbacks.onSemesters)

  return () => unsubs.forEach(fn => fn())
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => 
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))]);

// === SUBJECTS ===
export async function cloudAddSubject(subject: any) {
  const ref = await withTimeout(addDoc(userCol(getUid(), 'subjects'), clean(subject)), 10000);
  return ref.id;
}
export async function cloudUpdateSubject(id: string, changes: any) {
  await withTimeout(updateDoc(userDoc(getUid(), 'subjects', id), clean(changes)), 10000);
}
export async function cloudDeleteSubject(id: string) {
  await deleteDoc(userDoc(getUid(), 'subjects', id))
}

// === TASKS ===
export async function cloudAddTask(task: any) {
  await addDoc(userCol(getUid(), 'tasks'), clean(task))
}
export async function cloudUpdateTask(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'tasks', id), clean(changes))
}
export async function cloudDeleteTask(id: string) {
  await deleteDoc(userDoc(getUid(), 'tasks', id))
}

// === EVENTS ===
export async function cloudAddEvent(event: any) {
  const ref = await addDoc(userCol(getUid(), 'events'), clean(event))
  return ref.id
}
export async function cloudUpdateEvent(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'events', id), clean(changes))
}
export async function cloudDeleteEvent(id: string) {
  await deleteDoc(userDoc(getUid(), 'events', id))
}

// === DRIVE FILES ===
export async function cloudAddDriveFile(file: any) {
  await addDoc(userCol(getUid(), 'driveFiles'), clean(file))
}
export async function cloudDeleteDriveFile(id: string) {
  await deleteDoc(userDoc(getUid(), 'driveFiles', id))
}

// === CHAT SESSIONS ===
export async function cloudAddChatSession(session: any) {
  // Use session.id (uuid) as doc id
  await setDoc(userDoc(getUid(), 'chatSessions', session.id), clean(session))
}
export async function cloudUpdateChatSession(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'chatSessions', id), clean(changes))
}
export async function cloudDeleteChatSession(id: string) {
  await deleteDoc(userDoc(getUid(), 'chatSessions', id))
  // delete messages
  const snap = await getDocs(userCol(getUid(), 'chatMessages'))
  const batch = writeBatch(db_cloud)
  snap.docs.filter(d => d.data().sessionId === id).forEach(d => batch.delete(d.ref))
  await batch.commit()
}

// === CHAT MESSAGES ===
export async function cloudAddChatMessage(msg: any) {
  await addDoc(userCol(getUid(), 'chatMessages'), clean(msg))
}
export async function cloudUpdateChatMessage(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'chatMessages', id), clean(changes))
}
export async function cloudDeleteChatMessage(id: string) {
  await deleteDoc(userDoc(getUid(), 'chatMessages', id))
}

// === SEMESTERS / GPA ===
export async function cloudAddSemester(semester: any) {
  const ref = await withTimeout(addDoc(userCol(getUid(), 'semesters'), clean(semester)), 10000);
  return ref.id;
}
export async function cloudUpdateSemester(id: string, changes: any) {
  await withTimeout(updateDoc(userDoc(getUid(), 'semesters', id), clean(changes)), 10000);
}
export async function cloudDeleteSemester(id: string) {
  await deleteDoc(userDoc(getUid(), 'semesters', id));
}

export async function cloudClearAllData(uid: string) {
  const collections = ['subjects', 'tasks', 'events', 'chatSessions', 'chatMessages', 'driveFiles', 'semesters'];
  for (const col of collections) {
    const snap = await getDocs(userCol(getUid(), col));
    const batch = writeBatch(db_cloud);
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
  }
}

export async function getUserPinHash(uid: string) {
  const d = await getDoc(userDoc(getUid(), 'settings', 'security'))
  return d.exists() ? d.data().pinHash : null
}
export async function setUserPinHash(uid: string, hash: string) {
  await setDoc(userDoc(getUid(), 'settings', 'security'), { pinHash: hash }, { merge: true })
}
export async function getUserSettings(uid: string) {
  const d = await getDoc(userDoc(getUid(), 'settings', 'app'))
  return d.exists() ? d.data() : {}
}
export async function saveUserSettings(uid: string, settings: any) {
  await setDoc(userDoc(getUid(), 'settings', 'app'), settings, { merge: true })
}

export async function cloudUpdateDriveFile(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'driveFiles', id), clean(changes))
}

// === SUPER ADMIN & PRESENCE ===
export const SUPER_ADMIN_EMAIL = 'kromsa2006@gmail.com';

export async function recordUserHeartbeat(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }, extra?: { major?: string; semester?: string }) {
  if (!user || !user.uid) return;
  try {
    const userRef = doc(db_cloud, 'users', user.uid);
    const payload: any = {
      uid: user.uid,
      lastActiveAt: Date.now(),
      isOnline: true,
    };
    if (user.email) payload.email = user.email;
    if (user.displayName) payload.displayName = user.displayName;
    if (user.photoURL) payload.photoURL = user.photoURL;
    if (extra?.major) payload.major = extra.major;
    if (extra?.semester) payload.semester = extra.semester;

    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to record heartbeat:', err);
  }
}

export async function setUserOffline(uid: string) {
  if (!uid) return;
  try {
    const userRef = doc(db_cloud, 'users', uid);
    await setDoc(userRef, { isOnline: false, lastActiveAt: Date.now() }, { merge: true });
  } catch (err) {
    console.error('Failed to set user offline:', err);
  }
}

export async function adminGetUsers(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db_cloud, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('adminGetUsers failed:', err);
    return [];
  }
}

export async function adminSetUserBan(targetUid: string, isBanned: boolean, reason?: string) {
  const userRef = doc(db_cloud, 'users', targetUid);
  await setDoc(userRef, {
    isBanned,
    bannedReason: reason || null,
    bannedAt: isBanned ? Date.now() : null,
    isOnline: isBanned ? false : true
  }, { merge: true });
}

export async function adminKickUser(targetUid: string) {
  const userRef = doc(db_cloud, 'users', targetUid);
  await setDoc(userRef, {
    kickedAt: Date.now(),
    isOnline: false
  }, { merge: true });
}

export function subscribeToCurrentUserDoc(uid: string, callback: (docData: any) => void) {
  const userRef = doc(db_cloud, 'users', uid);
  return onSnapshot(userRef, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (err) => {
    console.error('subscribeToCurrentUserDoc error:', err);
  });
}

export function subscribeToSystemConfig(callback: (config: any) => void) {
  const sysRef = doc(db_cloud, 'system', 'config');
  return onSnapshot(sysRef, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (err) => {
    console.error('subscribeToSystemConfig error:', err);
  });
}

export async function adminSaveSystemConfig(config: any) {
  const sysRef = doc(db_cloud, 'system', 'config');
  await setDoc(sysRef, {
    ...config,
    updatedAt: Date.now()
  }, { merge: true });
}

export async function adminGetUserStats(uid: string) {
  try {
    const subjectsSnap = await getDocs(collection(db_cloud, 'users', uid, 'subjects'));
    const tasksSnap = await getDocs(collection(db_cloud, 'users', uid, 'tasks'));
    const filesSnap = await getDocs(collection(db_cloud, 'users', uid, 'driveFiles'));

    const totalTasks = tasksSnap.size;
    const completedTasks = tasksSnap.docs.filter(d => d.data().completed === true).length;
    const totalSubjects = subjectsSnap.size;
    const totalFiles = filesSnap.size;

    return {
      totalSubjects,
      totalTasks,
      completedTasks,
      totalFiles
    };
  } catch (err) {
    console.warn('adminGetUserStats failed:', err);
    return {
      totalSubjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      totalFiles: 0
    };
  }
}

export async function adminGetBroadcastHistory(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db_cloud, 'system_broadcasts'));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a: any, b: any) => (b.sentAt || 0) - (a.sentAt || 0));
    return items;
  } catch (err) {
    console.warn('adminGetBroadcastHistory failed:', err);
    return [];
  }
}

export async function adminDeleteBroadcastHistory(id: string) {
  await deleteDoc(doc(db_cloud, 'system_broadcasts', id));
}

export async function adminKickAllUsers() {
  const users = await adminGetUsers();
  const batch = writeBatch(db_cloud);
  let count = 0;
  for (const u of users) {
    if (u.email !== SUPER_ADMIN_EMAIL && u.id) {
      const ref = doc(db_cloud, 'users', u.id);
      batch.update(ref, { kickedAt: Date.now(), isOnline: false });
      count++;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

export async function adminSendPushNotification(payload: { target: string; targetUid?: string; title: string; body: string; url?: string }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  // Save to Broadcast History directly in Firestore first so it's never lost
  try {
    await addDoc(collection(db_cloud, 'system_broadcasts'), {
      title: payload.title,
      body: payload.body,
      target: payload.target === 'all' ? 'all' : payload.targetUid,
      recipientSummary: payload.target === 'all' ? 'جميع الطلاب' : 'طالب محدد',
      sentAt: Date.now(),
      sentBy: SUPER_ADMIN_EMAIL,
    });
  } catch (dbErr) {
    console.warn('Direct broadcast history save note:', dbErr);
  }

  let response: Response;
  try {
    response = await fetch('/api/admin/broadcast-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...payload, userEmail: user.email })
    });
  } catch (fetchErr: any) {
    throw new Error('تعذر الوصول إلى خادم الإشعارات: ' + (fetchErr?.message || 'Network error'));
  }

  const rawText = await response.text();
  let resData: any = null;
  try {
    resData = JSON.parse(rawText);
  } catch {
    // Non-JSON response (e.g. Vercel 500 error page)
    console.error('Server non-JSON response:', rawText);
    throw new Error(
      'تنبيه: تم حفظ الإشعار بالسجل ولكن خادم Vercel يحتاج لضبط مفاتيح Firebase (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY) في Vercel Dashboard.'
    );
  }

  if (!response.ok) {
    throw new Error(resData?.error || resData?.message || 'فشل إرسال الإشعار من الخادم');
  }

  return resData;
}



