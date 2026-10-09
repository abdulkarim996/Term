import React from 'react';
import { Wrench, RefreshCw, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useSettingsStore } from '../../store';
import { translations } from '../../locales';

interface MaintenanceScreenProps {
  message?: string | null;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  const language = useSettingsStore((s) => s.language);
  const dir = useSettingsStore((s) => s.dir);
  const t = (key: string) => translations[language]?.[key] || key;

  const handleRefresh = () => {
    window.location.reload();
  };

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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface-elevated/90 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-950/40 animate-fade-in">
        {/* Animated Maintenance Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Wrench size={38} className="text-amber-400 animate-bounce" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
          {t('maintenanceScreenTitle')}
        </h1>

        <p className="text-sm text-text-muted leading-relaxed mb-6">
          {message || t('maintenanceScreenDesc')}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRefresh}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            <span>{language === 'ar' ? 'إعادة المحاولة والتحقق' : 'Check & Refresh'}</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-border/50 border border-surface-border text-text-muted hover:text-text-primary text-xs font-medium transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
