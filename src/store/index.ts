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
  quickReviewFile: import('../store/dataStore').DriveFile | null
  showGpaModal: boolean
  showAdminModal: boolean
  systemConfig: any
  isUserBanned: boolean
  bannedReason: string | null

  setActiveTab: (tab: Tab) => void
  setCalendarView: (view: CalendarView) => void
  setSelectedDate: (ts: number) => void
  setShowAddTask: (v: boolean) => void
  setShowAddEvent: (v: boolean) => void
  setShowAddSubject: (v: boolean) => void
  setShowGpaModal: (v: boolean) => void
  setShowAdminModal: (v: boolean) => void
  setSystemConfig: (c: any) => void
  setIsUserBanned: (v: boolean) => void
  setBannedReason: (r: string | null) => void
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
  setCurrentUser: (user: AppUser | null) => void
  setAuthLoading: (v: boolean) => void
  setQuickReviewFile: (file: any | null) => void
}

export const SUPER_ADMIN_EMAIL = 'kromsa2006@gmail.com'

export const useUIStore = create<UIStore>()((set) => ({
  activeTab: 'home',
  calendarView: 'week',
  selectedDate: Date.now(),
  showAddTask: false,
  showAddEvent: false,
  showAddSubject: false,
  showGpaModal: false,
  showAdminModal: false,
  systemConfig: null,
  isUserBanned: false,
  bannedReason: null,
  toastMessage: null,
  toastType: 'success',
  currentUser: null,
  authLoading: true,
  quickReviewFile: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCalendarView: (view) => set({ calendarView: view }),
  setSelectedDate: (ts) => set({ selectedDate: ts }),
  setShowAddTask: (v) => set({ showAddTask: v }),
  setShowAddEvent: (v) => set({ showAddEvent: v }),
  setShowAddSubject: (v) => set({ showAddSubject: v }),
  setShowGpaModal: (v) => set({ showGpaModal: v }),
  setShowAdminModal: (v) => set({ showAdminModal: v }),
  setSystemConfig: (c) => set({ systemConfig: c }),
  setIsUserBanned: (v) => set({ isUserBanned: v }),
  setBannedReason: (r) => set({ bannedReason: r }),
  showToast: (msg, type = 'success') => {
    set({ toastMessage: msg, toastType: type })
    setTimeout(() => set({ toastMessage: null }), 3000)
  },
  clearToast: () => set({ toastMessage: null }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthLoading: (v) => set({ authLoading: v }),
  setQuickReviewFile: (file) => set({ quickReviewFile: file }),
}))

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
  gpaScale: 5 | 4
  targetGraduationHours: number
  showGpaOnHome: boolean
  baselineGpa: number
  baselineHours: number

  setTheme: (t: 'dark' | 'light') => void
  setBannerUrl: (url: string) => void
  setBlackboardUrl: (url: string) => void
  setGpaScale: (scale: 5 | 4) => void
  setTargetGraduationHours: (hours: number) => void
  setShowGpaOnHome: (v: boolean) => void
  setBaselineGpa: (gpa: number) => void
  setBaselineHours: (hours: number) => void

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
      gpaScale: 5,
      targetGraduationHours: 134,
      showGpaOnHome: true,
      baselineGpa: 0,
      baselineHours: 0,

      setTheme: (t) => set({ theme: t }),
      setBannerUrl: (url) => set({ bannerUrl: url }),
      setBlackboardUrl: (url) => set({ blackboardUrl: url }),
      setGpaScale: (scale) => set({ gpaScale: scale }),
      setTargetGraduationHours: (hours) => set({ targetGraduationHours: hours }),
      setShowGpaOnHome: (v) => set({ showGpaOnHome: v }),
      setBaselineGpa: (gpa) => set({ baselineGpa: gpa }),
      setBaselineHours: (hours) => set({ baselineHours: hours }),

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
    }),
    {
      name: 'student-dashboard-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
