import { useDataStore } from '../../store/dataStore';
import { cloudClearAllData } from '../../lib/firestore';
import React, { useState, useEffect } from 'react';
// @ts-nocheck
import {
  Settings, User, Key, Palette, Globe, Trash2,
  ChevronRight, Eye, EyeOff, Monitor,
  BookOpen, Download, AlertTriangle, LogOut
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth, getAppMessaging } from '../../lib/firebase'
import { getToken } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { db_cloud } from '../../lib/firebase'
import { Bell, Link as LinkIcon } from 'lucide-react'
import { useSettingsStore, useUIStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import AddSubjectModal from '../tasks/AddSubjectModal'
import ManageSubjectsModal from './ManageSubjectsModal'

// Reusable segmented control
function SegmentedControl({ options, value, onChange }: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center bg-[#0d0d0d] p-0.5 rounded-xl border border-white/5 w-full mt-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-[10px] transition-all duration-200 ${
            value === opt.value
              ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Minimal URL input
function UrlInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted mb-1 block">{label}</label>
      <div className="flex items-center gap-2 bg-[#0d0d0d] border border-white/5 rounded-xl px-3 py-2 focus-within:border-accent-blue/40 transition-colors">
        <span className="text-text-muted text-[10px] font-mono shrink-0">https://</span>
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'example.com'}
          className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder:text-text-muted/40 min-w-0"
        />
      </div>
    </div>
  )
}

export default function MoreScreen() {
  const { t, language } = useTranslation()
  const settings = useSettingsStore()
  const { showToast, currentUser } = useUIStore()
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const [pushEnabled, setPushEnabled] = useState(isNotificationSupported && Notification.permission === 'granted')
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showManageSubjects, setShowManageSubjects] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('profile')

  const subjects = useDataStore(state => state.subjects)

  const handlePushToggle = async () => {
    if (!confirm(t('confirmPushToggle') || 'هل أنت متأكد من تغيير حالة الإشعارات؟')) return;
    if (!isNotificationSupported) {
      showToast('عذراً، المتصفح لا يدعم هذه الخاصية حالياً');
      return;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      showToast(t('iosInstallPrompt') || 'الإشعارات تتطلب تثبيت التطبيق على الشاشة الرئيسية أولاً عبر متصفح Safari');
      return;
    }

    if (Notification.permission === 'default' || !pushEnabled) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          showToast(t('pushEnabledSuccess') || 'تم تفعيل الإشعارات بنجاح!');
          const msg = await getAppMessaging();
          if (msg) {
            const token = await getToken(msg, { vapidKey: (import.meta as any).env.VITE_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY' });
            if (token && currentUser) {
              await setDoc(doc(db_cloud, 'users', currentUser.uid), { fcmToken: token, fcmUpdatedAt: new Date() }, { merge: true });
            }
          }
        } else {
          setPushEnabled(false);
        }
      } catch (err) {
        console.error('Push error:', err);
      }
    } else {
      alert('Notification settings must be changed in browser settings.');
    }
  }

  const clearAllData = async () => {
    if (!confirm(t('confirmClearData') || 'Are you sure you want to clear all data?')) return;
    try {
      const uid = auth.currentUser?.uid;
      if (uid) await cloudClearAllData(uid);
      useDataStore.getState().setTasks([]);
      useDataStore.getState().setEvents([]);
      useDataStore.getState().setDriveFiles([]);
      showToast(t('dataCleared') || 'Data cleared', 'info');
    } catch (err) {
      showToast(t('error') || 'Error occurred', 'error');
    }
  }

  const exportData = () => {
    const data = useDataStore.getState()
    const exportObj = { tasks: data.tasks, events: data.events, subjects: data.subjects, settings: useSettingsStore.getState() }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(t('dataExported') || 'Data exported successfully', 'success')
  }

  const SectionHeader = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.FC<{ size: number; className: string }> }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className="w-full flex items-center justify-between py-2"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${activeSection === id ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-border text-text-muted'}`}>
          <Icon size={16} className="" />
        </div>
        <span className="font-semibold text-text-primary tracking-wide">{label}</span>
      </div>
      <ChevronRight size={18} className={`text-text-muted transition-transform duration-300 rtl-flip ${activeSection === id ? 'rotate-90 rtl-flip-none text-text-primary' : ''}`} />
    </button>
  )

  return (
    <>
    <div className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-4">
      <h1 className="text-xl font-bold text-text-primary mb-4">{t('more')}</h1>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-4">
          <SectionHeader id="profile" label={t("profile")} icon={User as React.FC<{ size: number; className: string }>} />
          {activeSection === 'profile' && (
            <div className="space-y-3 pt-2 animate-fade-in">
              <div className="flex items-center gap-3 bg-surface-elevated p-3 rounded-xl">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-surface-border object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-accent-blue" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{currentUser?.displayName || t('unknownUser')}</p>
                  <p className="text-[10px] text-text-muted truncate">{currentUser?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-1">{t("userName")}</label>
                  <input
                    type="text"
                    value={settings.userName}
                    onChange={(e) => settings.setUserName(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-blue/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-1">{t("userMajor")}</label>
                  <input
                    type="text"
                    value={settings.userMajor}
                    onChange={(e) => settings.setUserMajor(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-blue/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-1">{t("currentSemester")}</label>
                  <input
                    type="text"
                    value={settings.currentSemester}
                    onChange={(e) => settings.setCurrentSemester(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-blue/50 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Subjects ─────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <SectionHeader id="subjects" label={t("subjects")} icon={BookOpen as React.FC<{ size: number; className: string }>} />
            {activeSection === 'subjects' && (
              <button
                onClick={() => setShowManageSubjects(true)}
                className="text-xs text-accent-blue hover:text-blue-400 ml-2 flex-shrink-0"
              >
                {t('manage') || 'Manage'}
              </button>
            )}
          </div>
          {activeSection === 'subjects' && (
            <div className="space-y-2 pt-2 animate-fade-in">
              {subjects.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">{t('noSubjects') || 'No subjects available.'}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map(subject => (
                    <div
                      key={subject.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-elevated border border-surface-border/50 shadow-sm"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: subject.color }} />
                      <span className="text-xs font-medium text-text-primary truncate">{subject.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Preferences (includes API Keys + Quick Links) ─────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-4">
          <SectionHeader id="prefs" label={t("settings")} icon={Settings as React.FC<{ size: number; className: string }>} />
          {activeSection === 'prefs' && (
            <div className="space-y-4 pt-4 animate-fade-in">

              {/* Theme — Segmented Control */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-elevated border border-surface-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent-pink/10 flex items-center justify-center shrink-0">
                    <Palette size={15} className="text-accent-pink" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">{t("themeTitle")}</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">{t("themeDesc")}</p>
                  </div>
                </div>
                <SegmentedControl
                  value={settings.theme}
                  onChange={v => settings.setTheme(v as 'dark' | 'light')}
                  options={[
                    { label: t("dark") || 'Dark', value: 'dark' },
                    { label: t("light") || 'Light', value: 'light' },
                  ]}
                />
              </div>

              {/* Language — Segmented Control */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-elevated border border-surface-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 flex items-center justify-center shrink-0">
                    <Globe size={15} className="text-accent-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">{t("langTitle")}</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">{t("langDesc")}</p>
                  </div>
                </div>
                <SegmentedControl
                  value={settings.language}
                  onChange={v => settings.setLanguage(v as 'en' | 'ar')}
                  options={[
                    { label: t("english") || 'English', value: 'en' },
                    { label: t("arabic") || 'عربي', value: 'ar' },
                  ]}
                />
              </div>

              {/* Push Notifications Toggle */}
              <div
                className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-surface-border/50 hover:bg-surface-hover transition-all cursor-pointer"
                onClick={handlePushToggle}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${pushEnabled ? 'bg-accent-blue/15' : 'bg-surface-border'}`}>
                    <Bell size={15} className={pushEnabled ? 'text-accent-blue' : 'text-text-muted'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Push Notifications</p>
                    {/* dir="rtl" + text-right forces correct Arabic punctuation placement */}
                    <p className="text-[11px] text-text-muted mt-0.5 text-right" dir="rtl">
                      .الإشعارات تصل لآخر جهاز تم تفعيل الزر منه
                    </p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${pushEnabled ? 'bg-accent-blue' : 'bg-surface-border'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${pushEnabled ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              {/* ── API Keys (moved inside Preferences) ───────────── */}
              <div className="pt-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2 px-1">{t("apiKeys") || 'API Keys'}</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Key size={13} className="text-text-muted" />
                  </div>
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={settings.geminiApiKey}
                    onChange={(e) => settings.setGeminiApiKey(e.target.value)}
                    placeholder={t("geminiKey") || "Gemini API Key"}
                    className="w-full bg-[#0d0d0d] text-text-primary text-xs rounded-xl py-2.5 pl-9 pr-10 outline-none border border-white/5 focus:border-accent-blue/40 transition-colors font-mono"
                  />
                  <button
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                  >
                    {showGeminiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* ── Quick Links (fixed localization keys) ─────────── */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <LinkIcon size={13} className="text-accent-blue" />
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                    {language === 'ar' ? 'الروابط السريعة' : 'Quick Links'}
                  </p>
                </div>
                <p className="text-[10px] text-text-muted mb-3 px-1">
                  {language === 'ar' ? 'تخصيص روابط بوابة جامعتك' : 'Manage your university shortcuts'}
                </p>
                <div className="space-y-2">
                  <UrlInput
                    label={language === 'ar' ? 'رابط البانر' : 'Banner URL'}
                    value={settings.bannerUrl || ''}
                    onChange={v => settings.setBannerUrl(v)}
                    placeholder="banner.university.edu.sa"
                  />
                  <UrlInput
                    label={language === 'ar' ? 'رابط البلاك بورد' : 'Blackboard URL'}
                    value={settings.blackboardUrl || ''}
                    onChange={v => settings.setBlackboardUrl(v)}
                    placeholder="bb.university.edu.sa"
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Data Management ───────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-4">
          <SectionHeader id="data" label={t("data")} icon={Monitor as React.FC<{ size: number; className: string }>} />
          {activeSection === 'data' && (
            <div className="space-y-2 pt-2 animate-fade-in">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-elevated hover:bg-surface-hover transition-all border border-surface-border/50"
              >
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Download size={15} className="text-accent-green" />
                  {t("exportData")}
                </div>
                <ChevronRight size={14} className="text-text-muted rtl-flip" />
              </button>

              <button
                onClick={clearAllData}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-accent-red/5 border border-accent-red/20 hover:bg-accent-red/10 transition-all"
              >
                <div className="flex items-center gap-2.5 text-sm text-accent-red">
                  <AlertTriangle size={15} />
                  {t("clearData")}
                </div>
                <ChevronRight size={14} className="text-accent-red rtl-flip" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Log Out — standalone destructive action above footer ── */}
      <button
        onClick={() => {
          if (window.confirm(t("confirmLogout") || 'Are you sure you want to log out?')) {
            signOut(auth)
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-accent-red/25 text-accent-red text-sm font-semibold hover:bg-accent-red/8 active:scale-[0.98] transition-all"
      >
        <LogOut size={16} />
        {t("logout")}
      </button>

      {/* ── App Info — always the absolute last element ───────────── */}
      <div className="text-center py-8 mt-4 space-y-3 opacity-80 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center justify-center gap-3">
          <div className="h-px bg-surface-border flex-1 max-w-[40px]"></div>
          <p className="text-[10px] tracking-[0.2em] text-text-muted font-semibold uppercase">A PRODUCT BY</p>
          <div className="h-px bg-surface-border flex-1 max-w-[40px]"></div>
        </div>
        <h2 className="text-lg font-black tracking-[0.15em] bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue bg-clip-text text-transparent">
          ABDULKARIM ALFALLAJ
        </h2>
        <div className="space-y-1 pt-1">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
            &copy; {new Date().getFullYear()} All Rights Reserved.
          </p>
          <p className="text-[9px] text-text-muted/60">Term v2.0.1</p>
        </div>
      </div>

    </div>
    <AddSubjectModal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} />
    <ManageSubjectsModal isOpen={showManageSubjects} onClose={() => setShowManageSubjects(false)} />
    </>
  )
}
