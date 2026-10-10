import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useSettingsStore } from '../../store';
import { translations } from '../../locales';

interface BannedScreenProps {
  reason?: string | null;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({ reason }) => {
  const language = useSettingsStore((s) => s.language);
  const dir = useSettingsStore((s) => s.dir);
  const t = (key: string) => translations[language]?.[key] || key;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[9999] bg-[#0b0f19] flex items-center justify-center p-4 select-none"
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface-elevated/90 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-red-950/40 animate-fade-in">
        {/* Glowing Shield Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/20">
          <ShieldAlert size={40} className="text-red-500 animate-pulse" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
          {t('accountBannedTitle')}
        </h1>

        <p className="text-sm text-text-muted leading-relaxed mb-6">
          {t('accountBannedDesc')}
        </p>

        {reason && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-start">
            <span className="text-xs font-semibold text-red-400 block mb-1">
              {t('accountBannedReason')}
            </span>
            <p className="text-sm text-text-secondary break-words">{reason}</p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-text-primary text-sm font-medium transition-all flex items-center justify-center gap-2 group"
        >
          <LogOut size={16} className="text-text-muted group-hover:text-red-400 transition-colors" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};
