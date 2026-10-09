import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, AlertTriangle, CheckCircle, Flame, X, Clock } from 'lucide-react';
import { useUIStore, useSettingsStore } from '../../store';

export const AnnouncementBanner: React.FC = () => {
  const systemConfig = useUIStore((s) => s.systemConfig);
  const language = useSettingsStore((s) => s.language);
  const [dismissed, setDismissed] = useState(false);

  const announcement = systemConfig?.announcement;
  const isTemporary = announcement?.displayMode === 'temporary';
  const durationSec = announcement?.duration || 20;

  const [timeLeft, setTimeLeft] = useState(durationSec);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (announcement?.updatedAt) {
      const isDismissed = sessionStorage.getItem(`dismissed_announcement_${announcement.updatedAt}`);
      setDismissed(isDismissed === 'true');
      setTimeLeft(durationSec);
    }
  }, [announcement?.updatedAt, durationSec]);

  // Countdown timer for temporary announcements
  useEffect(() => {
    if (isTemporary && !dismissed && announcement?.active) {
      setTimeLeft(durationSec);
      if (timerRef.current) clearInterval(timerRef.current);

      const startTime = Date.now();
      const endTime = startTime + durationSec * 1000;

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDismissed(true);
        }
      }, 200);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isTemporary, dismissed, announcement?.active, announcement?.updatedAt, durationSec]);

  if (!announcement || !announcement.active || dismissed) {
    return null;
  }

  const title = language === 'ar' ? (announcement.titleAr || announcement.title) : (announcement.titleEn || announcement.title);
  const message = language === 'ar' ? (announcement.messageAr || announcement.message) : (announcement.messageEn || announcement.message);

  if (!title && !message) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (announcement.updatedAt) {
      sessionStorage.setItem(`dismissed_announcement_${announcement.updatedAt}`, 'true');
    }
  };

  const getTypeStyles = () => {
    switch (announcement.type) {
      case 'warning':
        return {
          bg: 'from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          progressBar: 'bg-amber-400',
          icon: <AlertTriangle size={16} className="text-amber-400" />
        };
      case 'success':
        return {
          bg: 'from-emerald-500/15 via-emerald-500/10 to-transparent border-emerald-500/30 text-emerald-300',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          progressBar: 'bg-emerald-400',
          icon: <CheckCircle size={16} className="text-emerald-400" />
        };
      case 'danger':
        return {
          bg: 'from-rose-500/15 via-rose-500/10 to-transparent border-rose-500/30 text-rose-300',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          progressBar: 'bg-rose-400',
          icon: <Flame size={16} className="text-rose-400" />
        };
      case 'info':
      default:
        return {
          bg: 'from-accent-blue/15 via-accent-purple/10 to-transparent border-accent-blue/30 text-blue-300',
          badge: 'bg-accent-blue/20 text-accent-blue border-accent-blue/40',
          progressBar: 'bg-accent-blue',
          icon: <Megaphone size={16} className="text-accent-blue" />
        };
    }
  };

  const style = getTypeStyles();
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSec) * 100));

  return (
    <div className={`relative mb-4 rounded-2xl bg-gradient-to-r ${style.bg} border backdrop-blur-xl shadow-lg animate-fade-in overflow-hidden`}>
      <div className="p-3.5 flex items-start gap-3">
        <div className={`p-2 rounded-xl border flex-shrink-0 ${style.badge}`}>
          {style.icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-0.5">
            {title && (
              <h4 className="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
                {title}
              </h4>
            )}
            {isTemporary && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-surface-elevated/80 border border-surface-border text-[10px] text-text-muted font-medium">
                <Clock size={10} className="animate-pulse" />
                <span>{timeLeft}s</span>
              </span>
            )}
          </div>
          {message && (
            <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed break-words">
              {message}
            </p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress countdown bar for temporary messages */}
      {isTemporary && (
        <div className="h-1 w-full bg-surface-elevated/50 overflow-hidden">
          <div
            className={`h-full ${style.progressBar} transition-all duration-200 ease-linear`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
