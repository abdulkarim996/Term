// @ts-nocheck
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Tab = 'home' | 'calendar' | 'tasks' | 'storage' | 'ai' | 'more' | 'study'
type CalendarView = 'day' | 'week' | 'month'

export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface UIStore {
  activeTab: Tab
  calendarView: CalendarView
  selectedDate: number // timestamp
  showAddTask: boolean
  showAddEvent: boolean
  showAddSubject: boolean
  toastMessage: string | null
  toastType: 'success' | 'error' | 'info'
  currentUser: AppUser | null
  authLoading: boolean

  setActiveTab: (tab: Tab) => void
  setCalendarView: (view: CalendarView) => void
  setSelectedDate: (ts: number) => void
  setShowAddTask: (v: boolean) => void
  setShowAddEvent: (v: boolean) => void
  setShowAddSubject: (v: boolean) => void
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
  setCurrentUser: (user: AppUser | null) => void
  setAuthLoading: (v: boolean) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  activeTab: 'home',
  calendarView: 'week',
  selectedDate: Date.now(),
  showAddTask: false,
  showAddEvent: false,
  showAddSubject: false,
  toastMessage: null,
  toastType: 'success',
  currentUser: null,
  authLoading: true,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCalendarView: (view) => set({ calendarView: view }),
  setSelectedDate: (ts) => set({ selectedDate: ts }),
  setShowAddTask: (v) => set({ showAddTask: v }),
  setShowAddEvent: (v) => set({ showAddEvent: v }),
  setShowAddSubject: (v) => set({ showAddSubject: v }),
  showToast: (msg, type = 'success') => {
    set({ toastMessage: msg, toastType: type })
    setTimeout(() => set({ toastMessage: null }), 3000)
  },
  clearToast: () => set({ toastMessage: null }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthLoading: (v) => set({ authLoading: v }) }))

// Settings store (persisted)
interface SettingsStore {
  geminiApiKey: string
  googleClientId: string
  googleClientSecret: string
  googleAccessToken: string
  googleRefreshToken: string
  language: 'ar' | 'en'
  dir: 'rtl' | 'ltr'
  userName: string
  userMajor: string
  currentSemester: string
  accentColor: string
  autoStudyBlocks: boolean
  theme: 'dark' | 'light'
  bannerUrl: string
  blackboardUrl: string
  setTheme: (t: 'dark' | 'light') => void
  setBannerUrl: (url: string) => void
  setBlackboardUrl: (url: string) => void

  setGeminiApiKey: (key: string) => void
  setGoogleClientId: (id: string) => void
  setGoogleClientSecret: (s: string) => void
  setGoogleTokens: (access: string, refresh: string) => void
  setLanguage: (lang: 'ar' | 'en') => void
  setUserName: (name: string) => void
  setUserMajor: (major: string) => void
  setCurrentSemester: (sem: string) => void
  setAccentColor: (color: string) => void
  setAutoStudyBlocks: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      googleClientId: '',
      googleClientSecret: '',
      googleAccessToken: '',
      googleRefreshToken: '',
      language: 'ar',
      dir: 'rtl',
      userName: '',
      userMajor: 'Industrial Engineering',
      currentSemester: '',
      accentColor: '#4f8ef7',
      autoStudyBlocks: true,
      theme: 'dark',
      bannerUrl: 'https://stuss.nbu.edu.sa/StudentSelfService',
      blackboardUrl: 'https://lms.nbu.edu.sa/webapps/login/',

      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setGoogleClientId: (id) => set({ googleClientId: id }),
      setGoogleClientSecret: (s) => set({ googleClientSecret: s }),
      setGoogleTokens: (access, refresh) => set({ googleAccessToken: access, googleRefreshToken: refresh }),
      setLanguage: (lang) => set({ language: lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }),
      setUserName: (name) => set({ userName: name }),
      setUserMajor: (major) => set({ userMajor: major }),
      setCurrentSemester: (sem) => set({ currentSemester: sem }),
      setAccentColor: (color) => set({ accentColor: color }),
      setAutoStudyBlocks: (v) => set({ autoStudyBlocks: v }),
      setTheme: (t) => set({ theme: t }),
      setBannerUrl: (url) => set({ bannerUrl: url }),
      setBlackboardUrl: (url) => set({ blackboardUrl: url }) }),
    {
      name: 'student-dashboard-settings',
      storage: createJSONStorage(() => localStorage) }
  )
)
