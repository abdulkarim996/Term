import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, BookOpen, CheckSquare, HardDrive,
  Bell, Ban, UserX, Clock, Radio, Smartphone, CheckCircle, AlertCircle
} from 'lucide-react';
import { adminGetUserStats } from '../../lib/firestore';
import { useSettingsStore } from '../../store';
import { translations } from '../../locales';

interface StudentDetailsModalProps {
  user: any;
  onClose: () => void;
  onKick: (user: any) => void;
  onToggleBan: (user: any) => void;
  onSendDirectPush: (user: any) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  user,
  onClose,
  onKick,
  onToggleBan,
  onSendDirectPush,
}) => {
  const language = useSettingsStore((s) => s.language);
  const dir = useSettingsStore((s) => s.dir);
  const t = (key: string) => translations[language]?.[key] || key;

  const [stats, setStats] = useState<{
    totalSubjects: number;
    totalTasks: number;
    completedTasks: number;
    totalFiles: number;
  }>({
    totalSubjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalFiles: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      if (user?.id) {
        setLoadingStats(true);
        const res = await adminGetUserStats(user.id);
        if (isMounted) {
          setStats(res);
          setLoadingStats(false);
        }
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, [user?.id]);

  if (!user) return null;

  const isOnline = user.lastActiveAt && (Date.now() - user.lastActiveAt) < 5 * 60 * 1000;
  const hasPushToken = !!user.fcmToken;

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return language === 'ar' ? 'غير مسجل' : 'Never';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return language === 'ar' ? 'الآن' : 'Just now';
    if (mins < 60) return language === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  };

  const taskCompletionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface-elevated/95 backdrop-blur-2xl border border-surface-border rounded-3xl shadow-2xl overflow-hidden animate-scale-up flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border bg-gradient-to-r from-accent-blue/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover border-2 border-surface-border shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-surface-border flex items-center justify-center font-bold text-text-primary text-lg">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary truncate">
                  {user.displayName || user.email?.split('@')[0] || t('unknownUser')}
                </h3>
                {user.isBanned && (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                    {t('bannedCount')}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status & Device Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Online Status */}
            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-surface border-surface-border text-text-muted'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-elevated text-text-muted'
              }`}>
                <Radio size={16} className={isOnline ? 'animate-pulse' : ''} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] block opacity-75">
                  {language === 'ar' ? 'حالة التواجد' : 'Status'}
                </span>
                <span className="text-xs font-semibold truncate block">
                  {isOnline ? t('onlineNow') : formatLastSeen(user.lastActiveAt)}
                </span>
              </div>
            </div>

            {/* iPhone / Push Status */}
            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
              hasPushToken
                ? 'bg-accent-blue/10 border-accent-blue/25 text-blue-300'
                : 'bg-surface border-surface-border text-text-muted'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                hasPushToken ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-elevated text-text-muted'
              }`}>
                <Smartphone size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] block opacity-75">
                  {language === 'ar' ? 'إشعارات الهاتف' : 'Push Notification'}
                </span>
                <span className="text-xs font-semibold truncate block flex items-center gap-1">
                  {hasPushToken ? (
                    <>
                      <CheckCircle size={12} className="text-emerald-400 inline" />
                      <span>{language === 'ar' ? 'جاهز للاستقبال' : 'Active'}</span>
                    </>
                  ) : (
                    <span>{language === 'ar' ? 'غير مفعل' : 'Not active'}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Profile (Non-sensitive info) */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {language === 'ar' ? 'المعلومات الأكاديمية' : 'Academic Profile'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-text-muted block">
                  {language === 'ar' ? 'التخصص الدراسي:' : 'Major:'}
                </span>
                <span className="font-semibold text-text-primary">
                  {user.major || (language === 'ar' ? 'غير محدد' : 'Not specified')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">
                  {language === 'ar' ? 'الفصل الدراسي:' : 'Semester:'}
                </span>
                <span className="font-semibold text-text-primary">
                  {user.semester || (language === 'ar' ? 'غير محدد' : 'Not specified')}
                </span>
              </div>
            </div>
          </div>

          {/* Non-sensitive Activity Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {language === 'ar' ? 'نشاط الطالب بالمنصة' : 'Student Activity Stats'}
              </h4>
              {loadingStats && (
                <span className="text-[10px] text-accent-blue animate-pulse">
                  {language === 'ar' ? 'جاري الحساب...' : 'Loading...'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Subjects count */}
              <div className="p-3 rounded-2xl bg-surface border border-surface-border text-center">
                <BookOpen size={16} className="mx-auto mb-1 text-accent-blue" />
                <span className="text-base font-bold text-text-primary block">
                  {stats.totalSubjects}
                </span>
                <span className="text-[10px] text-text-muted">
                  {language === 'ar' ? 'مواد مسجلة' : 'Subjects'}
                </span>
              </div>

              {/* Tasks count */}
              <div className="p-3 rounded-2xl bg-surface border border-surface-border text-center">
                <CheckSquare size={16} className="mx-auto mb-1 text-emerald-400" />
                <span className="text-base font-bold text-text-primary block">
                  {stats.completedTasks} / {stats.totalTasks}
                </span>
                <span className="text-[10px] text-text-muted">
                  {language === 'ar' ? `مهام (${taskCompletionRate}%)` : `Tasks (${taskCompletionRate}%)`}
                </span>
              </div>

              {/* Files count */}
              <div className="p-3 rounded-2xl bg-surface border border-surface-border text-center">
                <HardDrive size={16} className="mx-auto mb-1 text-purple-400" />
                <span className="text-base font-bold text-text-primary block">
                  {stats.totalFiles}
                </span>
                <span className="text-[10px] text-text-muted">
                  {language === 'ar' ? 'ملفات مخزنة' : 'Drive Files'}
                </span>
              </div>
            </div>
          </div>

          {/* Ban reason if banned */}
          {user.isBanned && user.bannedReason && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              <span className="font-bold block mb-0.5">{t('accountBannedReason')}</span>
              <span>{user.bannedReason}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-surface-border">
            {/* Direct Push Notification Button */}
            <button
              onClick={() => {
                onClose();
                onSendDirectPush(user);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 border border-accent-blue/30 text-accent-blue text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Bell size={14} />
              <span>
                {language === 'ar' ? 'إرسال إشعار مباشر لهذا الطالب' : 'Send Direct Push Notification'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* Kick button */}
              <button
                onClick={() => {
                  onKick(user);
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-surface-elevated hover:bg-surface-border text-text-primary text-xs font-medium border border-surface-border transition-colors flex items-center justify-center gap-1.5"
              >
                <UserX size={14} className="text-text-muted" />
                <span>{t('kickUser')}</span>
              </button>

              {/* Ban / Unban button */}
              <button
                onClick={() => {
                  onToggleBan(user);
                  onClose();
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  user.isBanned
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                }`}
              >
                <Ban size={14} />
                <span>{user.isBanned ? t('unbanUser') : t('banUser')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
