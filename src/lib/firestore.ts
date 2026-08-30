// @ts-nocheck
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, writeBatch, serverTimestamp,
  Timestamp, getDoc, onSnapshot, addDoc
} from 'firebase/firestore'
import { db_cloud, auth } from './firebase'

function getUid() { const uid = auth.currentUser?.uid; if (!uid) throw new Error('Not authenticated'); return uid; }

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

  return () => unsubs.forEach(fn => fn())
}

// === SUBJECTS ===
export async function cloudAddSubject(subject: any) {
  await addDoc(userCol(getUid(), 'subjects'), clean(subject))
}
export async function cloudUpdateSubject(id: string, changes: any) {
  await updateDoc(userDoc(getUid(), 'subjects', id), clean(changes))
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
  await addDoc(userCol(getUid(), 'events'), clean(event))
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

export async function cloudClearAllData(uid: string) {
  const collections = ['subjects', 'tasks', 'events', 'chatSessions', 'chatMessages', 'driveFiles'];
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
