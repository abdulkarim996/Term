// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, getAppMessaging } from './lib/firebase'
import { onMessage } from 'firebase/messaging'
import { getUserPinHash, getUserSettings, subscribeToUserData } from './lib/firestore'
import { useDataStore } from './store/dataStore'
import { useUIStore, useSettingsStore } from './store'
import { useTimerStore } from './store/timerStore'
import BottomNav from './components/layout/BottomNav'
import HomeScreen from './components/home/HomeScreen'
import CalendarScreen from './components/calendar/CalendarScreen'
import TasksScreen from './components/tasks/TasksScreen'
import StorageScreen from './components/storage/StorageScreen'
import AIScreen from './components/ai/AIScreen'
import MoreScreen from './components/more/MoreScreen'
import StudyScreen from './components/study/StudyScreen'
import Toast from './components/ui/Toast'
import UpdatePrompt from './components/ui/UpdatePrompt'
import AuthScreen from './components/auth/AuthScreen'
import PinSetup from './components/auth/PinSetup'
import { Sparkles, Loader2 } from 'lucide-react'


export default function App() {
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, isRefreshing } = usePullToRefresh(mainRef);

  useEffect(() => {
    if (localStorage.getItem('just_refreshed') === 'true') {
      localStorage.removeItem('just_refreshed');
      setTimeout(() => {
        showToast('تم التحديث بنجاح ✨', 'success');
      }, 500);
    }
  }, []);

  const { activeTab, toastMessage, toastType, clearToast, setCurrentUser, setAuthLoading, authLoading, currentUser, showToast } = useUIStore()
  const { dir, theme, setGoogleTokens, setGeminiApiKey } = useSettingsStore()
  const { isActive, timeLeft, setTimeLeft, setIsActive } = useTimerStore()
  const [pinStatus, setPinStatus] = useState<'loading' | 'needSetup' | 'done'>('loading')

  useEffect(() => {
    document.documentElement.dir = dir;
  }, [dir]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (isActive && timeLeft === 0) {
      setIsActive(false)
      showToast('انتهى الوقت! ⏰', 'success')
      // Play sound using Web Audio API
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContext) {
          const ctx = new AudioContext()
          const playBeep = (time: number, freq: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = freq
            
            gain.gain.setValueAtTime(0, ctx.currentTime + time)
            gain.gain.linearRampToValueAtTime(1, ctx.currentTime + time + 0.05)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.5)
            
            osc.connect(gain)
            gain.connect(ctx.destination)
            
            osc.start(ctx.currentTime + time)
            osc.stop(ctx.currentTime + time + 0.5)
          }

          // Play a nice alarm chime pattern
          playBeep(0, 523.25) // C5
          playBeep(0.15, 659.25) // E5
          playBeep(0.3, 783.99) // G5
          playBeep(0.45, 1046.50) // C6
          
          playBeep(1.0, 523.25)
          playBeep(1.15, 659.25)
          playBeep(1.3, 783.99)
          playBeep(1.45, 1046.50)
        }
      } catch (e) {
        console.error('Audio play failed:', e)
      }
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft])

  // ── Firebase Auth listener ──────────────────────────────────────────────────
  useEffect(() => {
    let unsubData: (() => void) | null = null
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL })

        // First-time migration
        const migratedKey = `migrated_${firebaseUser.uid}`
        if (!localStorage.getItem(migratedKey)) {
          
        }

        // Pull from cloud
        // await pullFromCloud(firebaseUser.uid)

        // Load Gemini API key from Firestore (fixes mobile re-login issue)
        const userSettings = await getUserSettings(firebaseUser.uid)
        if (userSettings.geminiApiKey) {
          setGeminiApiKey(userSettings.geminiApiKey)
        }

        // Check PIN status
        const pinHash = await getUserPinHash(firebaseUser.uid)
        if (pinHash) {
          setPinStatus('done')
        } else {
          setPinStatus('needSetup')
        }

        // Realtime sync listener
        if (unsubData) unsubData()
        unsubData = subscribeToUserData(firebaseUser.uid, {
          onSubjects: (cloudItems: any) => {
            useDataStore.getState().setSubjects(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          },
          onTasks: (cloudItems: any) => {
            useDataStore.getState().setTasks(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          },
          onEvents: (cloudItems: any) => {
            useDataStore.getState().setEvents(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          },
          onChatSessions: (cloudItems: any) => {
            useDataStore.getState().setChatSessions(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          },
          onChatMessages: (cloudItems: any) => {
            useDataStore.getState().setMessages(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          },
          onDriveFiles: (cloudItems: any) => {
            useDataStore.getState().setDriveFiles(cloudItems.map((item: any) => ({ ...item, id: item.cloudId })));
          }
        })
      } else {
        setCurrentUser(null)
        setPinStatus('loading')
        if (unsubData) { unsubData(); unsubData = null }
      }
      setAuthLoading(false)
    })
    return () => { unsub(); if (unsubData) unsubData() }
  }, [])

  // ── Google Drive OAuth callback ────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash
    if (window.location.pathname === '/oauth-callback' && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        setGoogleTokens(token, '')
        window.close()
      }
    }
  }, [setGoogleTokens])

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', dir === 'rtl' ? 'ar' : 'en')
  }, [dir])

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center animate-pulse-soft">
            <Sparkles size={28} className="text-accent-purple" />
          </div>
          <p className="text-sm text-text-muted">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <AuthScreen />
  }

  // PIN gate - show setup screen if user hasn't set a PIN yet
  if (pinStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center animate-pulse-soft">
            <Sparkles size={28} className="text-accent-purple" />
          </div>
          <p className="text-sm text-text-muted">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (pinStatus === 'needSetup') {
    return <PinSetup uid={currentUser.uid} onComplete={() => setPinStatus('done')} />
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-surface" dir={dir}>
      {/* Main Content */}
      <main
          ref={mainRef}
          className={`flex-1 flex flex-col relative min-h-0 ${activeTab === 'study' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
          style={{ paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Pull to refresh visual indicator */}
          <div 
            className="absolute left-0 right-0 flex justify-center items-center z-50 pointer-events-none transition-all duration-200"
            style={{ 
              top: `${Math.min(20, Math.max(-20, pullDistance - 40))}px`, 
              opacity: pullDistance > 10 ? (pullDistance / 60) : 0 
            }}
          >
            <div className="bg-surface-elevated shadow-lg rounded-full p-2 border border-surface-border">
              <Loader2 
                size={20} 
                className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} 
                style={{ transform: isRefreshing ? 'none' : `rotate(${pullDistance * 6}deg)` }} 
              />
            </div>
          </div>
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'calendar' && <CalendarScreen />}
          {activeTab === 'tasks' && <TasksScreen />}
          {activeTab === 'storage' && <StorageScreen />}
          {activeTab === 'study' && <StudyScreen />}
          {activeTab === 'ai' && <AIScreen />}
          {activeTab === 'more' && <MoreScreen />}
        </div>
      </main>

      <UpdatePrompt />
      {/* Bottom Navigation */}
      <BottomNav />

      {/* Toast notifications */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onDismiss={clearToast} />
      )}
    </div>
  )
}


