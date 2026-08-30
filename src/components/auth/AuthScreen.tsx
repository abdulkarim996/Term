import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
﻿import React from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'
import { Sparkles } from 'lucide-react'

export default function AuthScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged in App.tsx will handle the rest
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-surface-border flex items-center justify-center">
            <Sparkles size={36} className="text-accent-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">تِرْم | Term</h1>
            <p className="text-sm text-text-muted mt-1">{t('smartPlatform')}</p>
          </div>
        </div>

        {/* Features */}
        <div className="glass-card p-4 space-y-3 text-right">
          {[
            { icon: '📅', text: t('smartSchedule') },
            { icon: '✅', text: t('trackTasks') },
            { icon: '🧠', text: t('aiAssistantSupp') },
            { icon: '☁️', text: t('gdriveLink') },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="text-lg">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3.5 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
            )}
            <span>{loading ? 'جاري تسجيل الدخول...' : t('loginWithGoogle')}</span>
          </button>

          {error && (
            <p className="text-xs text-accent-red text-center">{error}</p>
          )}

          <p className="text-[11px] text-text-muted leading-relaxed">
            يتم تسجيل الدخول باستخدام حسابك في قوقل بشكل آمن عبر Firebase. لا يتم تخزين أي بيانات حساسة على خوادمنا.
          </p>
        </div>
      </div>

            <div className="flex flex-col gap-2 mt-6 text-center opacity-60">
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="h-px bg-text-muted/30 flex-1 max-w-[30px]"></div>
          <p className="text-[9px] tracking-[0.2em] text-text-muted font-semibold uppercase">
            A PRODUCT BY
          </p>
          <div className="h-px bg-text-muted/30 flex-1 max-w-[30px]"></div>
        </div>
        <h2 className="text-sm font-black tracking-[0.15em] text-text-primary/70 uppercase">
          ABDULKARIM ALFALLAJ
        </h2>
        <p className="text-[8px] text-text-muted uppercase tracking-wider font-medium">
          &copy; {new Date().getFullYear()} All Rights Reserved.
        </p>
      </div>
    </div>
  )
}