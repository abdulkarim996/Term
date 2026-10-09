import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Users, Radio, Clock, Ban, UserX,
  Search, RefreshCw, Megaphone, Wrench, AlertTriangle,
  CheckCircle, Flame, Info, Check, UserCheck, ShieldAlert,
  Smartphone, Send, RotateCcw, Trash2, Eye, Bell, ChevronRight,
  Sparkles, History, AlertOctagon
} from 'lucide-react';
import {
  SUPER_ADMIN_EMAIL,
  adminGetUsers,
  adminSetUserBan,
  adminKickUser,
  adminSaveSystemConfig,
  recordUserHeartbeat,
  adminGetBroadcastHistory,
  adminDeleteBroadcastHistory,
  adminKickAllUsers,
  adminSendPushNotification
} from '../../lib/firestore';
import { useUIStore, useSettingsStore } from '../../store';
import { translations } from '../../locales';
import { StudentDetailsModal } from './StudentDetailsModal';

export const AdminModal: React.FC = () => {
  const currentUser = useUIStore((s) => s.currentUser);
  const showAdminModal = useUIStore((s) => s.showAdminModal);
  const setShowAdminModal = useUIStore((s) => s.setShowAdminModal);
  const systemConfig = useUIStore((s) => s.systemConfig);
  const setSystemConfig = useUIStore((s) => s.setSystemConfig);
  const showToast = useUIStore((s) => s.showToast);

  const language = useSettingsStore((s) => s.language);
  const dir = useSettingsStore((s) => s.dir);
  const t = (key: string) => translations[language]?.[key] || key;

  // Security gate
  if (!showAdminModal || currentUser?.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<'users' | 'announcement' | 'push' | 'maintenance'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Selected student for details sheet
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);

  // Announcement state
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success' | 'danger'>('info');
  const [announcementDisplayMode, setAnnouncementDisplayMode] = useState<'temporary' | 'pinned'>('temporary');
  const [announcementDuration, setAnnouncementDuration] = useState(20);
  const [announcementTitleAr, setAnnouncementTitleAr] = useState('');
  const [announcementTitleEn, setAnnouncementTitleEn] = useState('');
  const [announcementMessageAr, setAnnouncementMessageAr] = useState('');
  const [announcementMessageEn, setAnnouncementMessageEn] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Push notifications state
  const [pushTarget, setPushTarget] = useState<'all' | string>('all');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('');
  const [sendingPush, setSendingPush] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Maintenance state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsgAr, setMaintenanceMsgAr] = useState('');
  const [maintenanceMsgEn, setMaintenanceMsgEn] = useState('');
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [kickingAll, setKickingAll] = useState(false);

  // Sync state from systemConfig when loaded
  useEffect(() => {
    if (systemConfig) {
      if (systemConfig.announcement) {
        setAnnouncementActive(!!systemConfig.announcement.active);
        setAnnouncementType(systemConfig.announcement.type || 'info');
        setAnnouncementDisplayMode(systemConfig.announcement.displayMode || 'temporary');
        setAnnouncementDuration(systemConfig.announcement.duration || 20);
        setAnnouncementTitleAr(systemConfig.announcement.titleAr || '');
        setAnnouncementTitleEn(systemConfig.announcement.titleEn || '');
        setAnnouncementMessageAr(systemConfig.announcement.messageAr || '');
        setAnnouncementMessageEn(systemConfig.announcement.messageEn || '');
      }
      setMaintenanceMode(!!systemConfig.maintenanceMode);
      setMaintenanceMsgAr(systemConfig.maintenanceMessageAr || '');
      setMaintenanceMsgEn(systemConfig.maintenanceMessageEn || '');
    }
  }, [systemConfig]);

  // Fetch users list
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      if (currentUser?.uid) {
        await recordUserHeartbeat(currentUser, {
          major: useSettingsStore.getState().userMajor,
          semester: useSettingsStore.getState().currentSemester,
        });
      }
      const data = await adminGetUsers();
      data.sort((a: any, b: any) => {
        const aActive = a.lastActiveAt || 0;
        const bActive = b.lastActiveAt || 0;
        return bActive - aActive;
      });
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch broadcast history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await adminGetBroadcastHistory();
      setBroadcastHistory(history);
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'push') {
      fetchHistory();
    }
  }, [activeTab]);

  // Time calculations
  const now = Date.now();
  const onlineUsers = users.filter((u) => u.lastActiveAt && (now - u.lastActiveAt) < 5 * 60 * 1000);
  const active24hUsers = users.filter((u) => u.lastActiveAt && (now - u.lastActiveAt) < 24 * 60 * 60 * 1000);
  const bannedUsers = users.filter((u) => u.isBanned);
  const usersWithPush = users.filter((u) => !!u.fcmToken);

  // Filtered users for table
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.major && u.major.toLowerCase().includes(q))
    );
  });

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

  // Kick action
  const handleKickUser = async (user: any) => {
    if (!window.confirm(t('confirmKick'))) return;
    setActionLoading(user.id);
    try {
      await adminKickUser(user.id);
      showToast(t('kickSuccess'), 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, kickedAt: Date.now(), isOnline: false } : u))
      );
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Ban action
  const handleToggleBan = async (user: any) => {
    const willBan = !user.isBanned;
    let reason = '';
    if (willBan) {
      if (!window.confirm(t('confirmBan'))) return;
      const inputReason = window.prompt(t('banReasonPrompt'), '');
      if (inputReason !== null) {
        reason = inputReason.trim();
      }
    }

    setActionLoading(user.id);
    try {
      await adminSetUserBan(user.id, willBan, reason);
      showToast(t('banSuccess'), 'success');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isBanned: willBan, bannedReason: reason || null } : u
        )
      );
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    try {
      const updatedAnnouncement = {
        active: announcementActive,
        type: announcementType,
        displayMode: announcementDisplayMode,
        duration: Number(announcementDuration) || 20,
        titleAr: announcementTitleAr.trim(),
        titleEn: announcementTitleEn.trim(),
        messageAr: announcementMessageAr.trim(),
        messageEn: announcementMessageEn.trim(),
        updatedAt: Date.now(),
      };
      await adminSaveSystemConfig({ announcement: updatedAnnouncement });
      setSystemConfig({ ...systemConfig, announcement: updatedAnnouncement });
      showToast(t('announcementPublished'), 'success');
    } catch (err: any) {
      console.error('Save announcement failed:', err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Send Push Notification
  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      showToast(language === 'ar' ? 'يرجى كتابة عنوان الإشعار ونصه' : 'Please provide title and body', 'error');
      return;
    }

    setSendingPush(true);
    try {
      const payload: any = {
        target: pushTarget === 'all' ? 'all' : 'single',
        targetUid: pushTarget !== 'all' ? pushTarget : undefined,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        url: pushUrl.trim() || undefined,
      };

      const result = await adminSendPushNotification(payload);
      if (result.success) {
        showToast(
          language === 'ar'
            ? `تم إرسال الإشعار بنجاح إلى ${result.deliveredCount} جهاز 📱`
            : `Delivered to ${result.deliveredCount} devices 📱`,
          'success'
        );
        setPushTitle('');
        setPushBody('');
        fetchHistory();
      } else {
        showToast(result.message || t('errorOccurred'), 'info');
      }
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setSendingPush(false);
    }
  };

  // Re-send from history
  const handleReSendBroadcast = (item: any) => {
    setPushTitle(item.title || '');
    setPushBody(item.body || '');
    setPushTarget(item.target === 'all' ? 'all' : item.target);
    showToast(
      language === 'ar' ? 'تم نسخ بيانات الإشعار للنموذج، يمكنك تعديله أو إرساله الآن' : 'Loaded into form',
      'info'
    );
  };

  // Delete history item
  const handleDeleteHistoryItem = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'حذف هذا السجل؟' : 'Delete this record?')) return;
    try {
      await adminDeleteBroadcastHistory(id);
      setBroadcastHistory((prev) => prev.filter((h) => h.id !== id));
      showToast(language === 'ar' ? 'تم الحذف من السجل' : 'Deleted', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Save Maintenance
  const handleSaveMaintenance = async () => {
    if (maintenanceMode && !systemConfig?.maintenanceMode) {
      const confirmOn = window.confirm(
        language === 'ar'
          ? 'تحذير هام: تفعيل وضع الصيانة سيحجب التطبيق فوراً عن جميع الطلاب والمستخدمين باستثنائك! هل أنت متأكد؟'
          : 'Warning: Enabling Maintenance Mode will immediately lock out all users except you! Are you sure?'
      );
      if (!confirmOn) return;
    }

    setSavingMaintenance(true);
    try {
      const payload = {
        maintenanceMode,
        maintenanceMessageAr: maintenanceMsgAr.trim(),
        maintenanceMessageEn: maintenanceMsgEn.trim(),
      };
      await adminSaveSystemConfig(payload);
      setSystemConfig({ ...systemConfig, ...payload });
      showToast(t('changesSaved'), 'success');
    } catch (err: any) {
      console.error('Save maintenance failed:', err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  // Emergency Kick All
  const handleEmergencyKickAll = async () => {
    const confirm1 = window.confirm(
      language === 'ar'
        ? '⚠️ تحذير طارئ: هل أنت متأكد من رغبتك في تسجيل خروج وطرد جميع الطلاب المسجلين بالمنصة حالياً دفعة واحدة؟'
        : 'Emergency Warning: Are you sure you want to kick all active users now?'
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      language === 'ar'
        ? 'تأكيد أخير: سيتم إنهاء جلسات الجميع فوراً، ولن يتأثر حسابك كمسؤول.'
        : 'Final Confirmation: All user sessions will terminate immediately.'
    );
    if (!confirm2) return;

    setKickingAll(true);
    try {
      const kickedCount = await adminKickAllUsers();
      showToast(
        language === 'ar'
          ? `تم إنهاء جلسات ${kickedCount} طالب بنجاح ⚡`
          : `Kicked ${kickedCount} users successfully ⚡`,
        'success'
      );
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t('errorOccurred'), 'error');
    } finally {
      setKickingAll(false);
    }
  };

  return (
    <>
      <div
        dir={dir}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        onClick={() => setShowAdminModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface-elevated/95 backdrop-blur-2xl border border-surface-border rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-surface-border/60 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-text-primary">
                    {t('adminPanel')}
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{currentUser?.email}</p>
              </div>
            </div>

            <button
              onClick={() => setShowAdminModal(false)}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-border/40 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-3 sm:px-6 border-b border-surface-border/40 bg-surface/40 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Users size={15} />
              <span>{t('usersAndActivity')}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('announcement')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'announcement'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Megaphone size={15} />
              <span>{t('announcements')}</span>
              {announcementActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('push')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'push'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Smartphone size={15} />
              <span>{language === 'ar' ? 'إشعارات الهاتف' : 'Push Notifications'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                {usersWithPush.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'maintenance'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Wrench size={15} />
              <span>{t('maintenanceAndControls')}</span>
              {maintenanceMode && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ════════════════════ TAB 1: USERS & ACTIVITY ════════════════════ */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface border border-surface-border flex flex-col">
                    <div className="flex items-center justify-between text-text-muted mb-1">
                      <span className="text-[11px] font-medium">{t('totalRegistered')}</span>
                      <Users size={14} className="text-accent-blue" />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-text-primary">
                      {users.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                    <div className="flex items-center justify-between text-emerald-400 mb-1">
                      <span className="text-[11px] font-medium">{t('onlineNow')}</span>
                      <Radio size={14} className="animate-pulse" />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-300">
                      {onlineUsers.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                    <div className="flex items-center justify-between text-purple-400 mb-1">
                      <span className="text-[11px] font-medium">{t('activeToday')}</span>
                      <Clock size={14} />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-purple-300">
                      {active24hUsers.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col">
                    <div className="flex items-center justify-between text-blue-400 mb-1">
                      <span className="text-[11px] font-medium">
                        {language === 'ar' ? 'إشعارات الهاتف' : 'Push Active'}
                      </span>
                      <Smartphone size={14} />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-blue-300">
                      {usersWithPush.length}
                    </span>
                  </div>
                </div>

                {/* Search & Refresh Toolbar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchUserPlaceholder')}
                      className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="p-2.5 rounded-xl bg-surface border border-surface-border text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                    title="Refresh users"
                  >
                    <RefreshCw
                      size={15}
                      className={loadingUsers ? 'animate-spin text-accent-blue' : ''}
                    />
                  </button>
                </div>

                {/* Users List with Click-to-Inspect Profile */}
                <div className="space-y-2.5">
                  <p className="text-[11px] text-text-muted">
                    {language === 'ar'
                      ? '💡 انقر على أي طالب لعرض ملفه ونشاطه وإرسال إشعار خاص به.'
                      : '💡 Click any student to inspect non-sensitive details and send direct notifications.'}
                  </p>

                  {loadingUsers && users.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-sm">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-accent-blue" />
                      <span>{t('loading') || 'جاري تحميل قائمة الطلاب...'}</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs sm:text-sm">
                      {language === 'ar'
                        ? 'لم يتم العثور على مستخدمين أو طلاب.'
                        : 'No users or students found.'}
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isOnline =
                        user.lastActiveAt && now - user.lastActiveAt < 5 * 60 * 1000;
                      const isOwner = user.email === SUPER_ADMIN_EMAIL;
                      const isBanned = !!user.isBanned;
                      const hasPush = !!user.fcmToken;

                      return (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUserForDetails(user)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:border-accent-blue/40 hover:scale-[1.005] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isBanned
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : isOnline
                              ? 'bg-emerald-950/15 border-emerald-500/30'
                              : 'bg-surface border-surface-border/60'
                          }`}
                        >
                          {/* User identity info */}
                          <div className="flex items-center gap-3 min-w-0">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-surface-border flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center font-bold text-text-secondary text-sm flex-shrink-0">
                                {(user.displayName || user.email || 'U')[0].toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary truncate">
                                  {user.displayName || user.email?.split('@')[0] || t('unknownUser')}
                                </span>
                                {isOwner && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-400 text-[10px] font-bold">
                                    Owner
                                  </span>
                                )}
                                {hasPush && (
                                  <span
                                    title="iPhone / Phone Push Notifications Active"
                                    className="p-1 rounded bg-blue-500/15 text-blue-400"
                                  >
                                    <Smartphone size={11} />
                                  </span>
                                )}
                                {isBanned && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                    {t('bannedCount')}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-text-muted truncate">
                                {user.email || 'No email'}
                              </p>

                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                                {user.major && <span>{user.major}</span>}
                                {user.major && <span>•</span>}
                                <span>
                                  {isOnline ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      {t('onlineNow')}
                                    </span>
                                  ) : (
                                    <span>{formatLastSeen(user.lastActiveAt)}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div
                            className="flex items-center gap-2 self-end sm:self-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedUserForDetails(user)}
                              className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-border text-text-muted hover:text-text-primary transition-colors"
                              title={language === 'ar' ? 'تفاصيل الطالب' : 'Student details'}
                            >
                              <Eye size={14} />
                            </button>

                            {!isOwner && (
                              <>
                                <button
                                  onClick={() => handleKickUser(user)}
                                  disabled={actionLoading === user.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-border/60 border border-surface-border text-text-secondary text-xs font-medium transition-colors flex items-center gap-1.5"
                                  title={t('confirmKick')}
                                >
                                  <UserX size={13} className="text-text-muted" />
                                  <span>{t('kickUser')}</span>
                                </button>

                                <button
                                  onClick={() => handleToggleBan(user)}
                                  disabled={actionLoading === user.id}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    isBanned
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {isBanned ? (
                                    <>
                                      <UserCheck size={13} />
                                      <span>{t('unbanUser')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban size={13} />
                                      <span>{t('banUser')}</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════ TAB 2: ANNOUNCEMENTS ════════════════════ */}
            {activeTab === 'announcement' && (
              <div className="space-y-6">
                {/* Enable / Disable Switch */}
                <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t('announcementActiveLabel')}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {language === 'ar'
                        ? 'يصل فورياً وبشكل مباشر لجميع الطلاب المتصلين بالمنصة.'
                        : 'Delivered in real-time instantly to all connected students.'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementActive}
                      onChange={(e) => setAnnouncementActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Display Mode (20s Auto-dismiss vs Pinned) */}
                <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
                  <label className="block text-xs font-medium text-text-muted">
                    {language === 'ar' ? 'طريقة بقاء وظهور الرسالة للطلاب:' : 'Display & Dismissal Mode:'}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAnnouncementDisplayMode('temporary')}
                      className={`p-3.5 rounded-2xl border text-start transition-all flex items-start gap-3 ${
                        announcementDisplayMode === 'temporary'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm'
                          : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 mt-0.5">
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-0.5 text-text-primary">
                          {language === 'ar' ? '⏱️ رسالة مؤقتة (تختفي بعد 20 ثانية)' : 'Temporary (Auto 20s)'}
                        </span>
                        <span className="text-[11px] text-text-muted leading-relaxed">
                          {language === 'ar'
                            ? 'تظهر مع شريط عد تنازلي متحرك وتختفي تلقائياً فور انتهاء الوقت.'
                            : 'Fades out automatically after 20 seconds with animated progress bar.'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnnouncementDisplayMode('pinned')}
                      className={`p-3.5 rounded-2xl border text-start transition-all flex items-start gap-3 ${
                        announcementDisplayMode === 'pinned'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm'
                          : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 mt-0.5">
                        <Megaphone size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-0.5 text-text-primary">
                          {language === 'ar' ? '📌 رسالة مثبتة (تبقى ظاهرة)' : 'Pinned Announcement'}
                        </span>
                        <span className="text-[11px] text-text-muted leading-relaxed">
                          {language === 'ar'
                            ? 'تبقى ثابتة أعلى الصفحة حتى يقوم الطالب بالنقر على إغلاق (X).'
                            : 'Remains pinned at the top until dismissed by the student.'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Type Selector */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">
                    {t('announcementType')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'info', label: 'معلومة (Info)', icon: Info, color: 'text-accent-blue border-accent-blue/40 bg-accent-blue/10' },
                      { key: 'warning', label: 'تنبيه (Warning)', icon: AlertTriangle, color: 'text-amber-400 border-amber-400/40 bg-amber-400/10' },
                      { key: 'success', label: 'نجاح (Success)', icon: CheckCircle, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' },
                      { key: 'danger', label: 'عاجل (Urgent)', icon: Flame, color: 'text-rose-400 border-rose-400/40 bg-rose-400/10' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAnnouncementType(item.key as any)}
                        className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                          announcementType === item.key
                            ? item.color + ' shadow-sm'
                            : 'bg-surface border-surface-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <item.icon size={15} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {t('announcementTitleLabel')} (العربية)
                    </label>
                    <input
                      type="text"
                      value={announcementTitleAr}
                      onChange={(e) => setAnnouncementTitleAr(e.target.value)}
                      placeholder="مثال: تنبيه هام بخصوص موعد الاختبار 🚀"
                      className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {t('announcementTitleLabel')} (English)
                    </label>
                    <input
                      type="text"
                      value={announcementTitleEn}
                      onChange={(e) => setAnnouncementTitleEn(e.target.value)}
                      placeholder="e.g. Important Exam Schedule Update 🚀"
                      className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                {/* Message Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {t('announcementMessageLabel')} (العربية)
                    </label>
                    <textarea
                      rows={3}
                      value={announcementMessageAr}
                      onChange={(e) => setAnnouncementMessageAr(e.target.value)}
                      placeholder="اكتب تفاصيل الرسالة هنا..."
                      className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs sm:text-sm text-text-primary focus:border-purple-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {t('announcementMessageLabel')} (English)
                    </label>
                    <textarea
                      rows={3}
                      value={announcementMessageEn}
                      onChange={(e) => setAnnouncementMessageEn(e.target.value)}
                      placeholder="Write message details here..."
                      className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs sm:text-sm text-text-primary focus:border-purple-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Live Preview */}
                <div>
                  <span className="block text-xs font-medium text-text-muted mb-2">
                    {language === 'ar' ? 'معاينة حية للمستخدمين:' : 'Live Student Preview:'}
                  </span>
                  <div className="p-4 rounded-2xl bg-surface/80 border border-surface-border/50">
                    <div
                      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                        announcementType === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : announcementType === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : announcementType === 'danger'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-accent-blue/10 border-accent-blue/30 text-blue-300'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-surface-elevated flex-shrink-0">
                        {announcementType === 'warning' ? (
                          <AlertTriangle size={16} className="text-amber-400" />
                        ) : announcementType === 'success' ? (
                          <CheckCircle size={16} className="text-emerald-400" />
                        ) : announcementType === 'danger' ? (
                          <Flame size={16} className="text-rose-400" />
                        ) : (
                          <Megaphone size={16} className="text-accent-blue" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-text-primary">
                            {announcementTitleAr || announcementTitleEn || 'عنوان الإعلان الافتراضي'}
                          </h4>
                          {announcementDisplayMode === 'temporary' && (
                            <span className="px-1.5 py-0.2 rounded bg-surface-elevated text-[10px] text-text-muted">
                              ⏱️ 20s
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                          {announcementMessageAr ||
                            announcementMessageEn ||
                            'تفاصيل الرسالة التي ستظهر للمستخدمين فوراً.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publish Button */}
                <button
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
                >
                  {savingAnnouncement ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{t('publishAnnouncement')}</span>
                </button>
              </div>
            )}

            {/* ════════════════════ TAB 3: PUSH NOTIFICATIONS ════════════════════ */}
            {activeTab === 'push' && (
              <div className="space-y-6">
                {/* Push Header & Devices Readiness card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-purple-600/10 to-transparent border border-blue-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        {language === 'ar'
                          ? 'إرسال إشعارات الآيفون والهواتف (Web Push)'
                          : 'iOS / Mobile Web Push Notification'}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {language === 'ar'
                          ? 'تصل لشاشة القفل حتى عند إغلاق التطبيق للمستخدمين المفعلين.'
                          : 'Delivers directly to device lock screens via FCM service.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-lg font-bold text-blue-300 block">
                      {usersWithPush.length} / {users.length}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {language === 'ar' ? 'أجهزة مفعلة' : 'Registered Devices'}
                    </span>
                  </div>
                </div>

                {/* Target Selector */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    {language === 'ar' ? 'وجهة الإشعار (المستلمون):' : 'Notification Target:'}
                  </label>
                  <select
                    value={pushTarget}
                    onChange={(e) => setPushTarget(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary focus:border-blue-500 outline-none"
                  >
                    <option value="all">
                      {language === 'ar'
                        ? `🌐 جميع الطلاب (${usersWithPush.length} جهاز مفعل)`
                        : `🌐 All Students (${usersWithPush.length} active devices)`}
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.displayName || u.email} {u.fcmToken ? '📱 (جاهز)' : '⚪ (غير مفعل)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title & Body */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {language === 'ar' ? 'عنوان الإشعار:' : 'Notification Title:'}
                    </label>
                    <input
                      type="text"
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: تنبيه هام من إدارة المنصة 📢' : 'e.g. Important Announcement 📢'}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                      {language === 'ar' ? 'نص الإشعار:' : 'Notification Body:'}
                    </label>
                    <textarea
                      rows={3}
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتب الرسالة التي ستصل لجهاز الطالب...' : 'Message body...'}
                      className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs sm:text-sm text-text-primary focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={handleSendPush}
                  disabled={sendingPush || (!pushTitle.trim() && !pushBody.trim())}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                >
                  {sendingPush ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>
                    {language === 'ar' ? 'إرسال الإشعار للأجهزة الآن 📲' : 'Dispatch Push Notification Now 📲'}
                  </span>
                </button>

                {/* Broadcast History */}
                <div className="space-y-3 pt-4 border-t border-surface-border/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <History size={14} className="text-accent-blue" />
                      <span>{language === 'ar' ? 'سجل الإشعارات السابقة' : 'Broadcast History'}</span>
                    </h4>
                    <button
                      onClick={fetchHistory}
                      className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
                      <span>{language === 'ar' ? 'تحديث السجل' : 'Refresh'}</span>
                    </button>
                  </div>

                  {loadingHistory && broadcastHistory.length === 0 ? (
                    <div className="py-6 text-center text-text-muted text-xs">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-1 text-accent-blue" />
                      <span>{language === 'ar' ? 'جاري التحميل...' : 'Loading history...'}</span>
                    </div>
                  ) : broadcastHistory.length === 0 ? (
                    <div className="py-6 text-center text-text-muted text-xs bg-surface rounded-2xl border border-surface-border">
                      {language === 'ar' ? 'لا توجد إشعارات سابقة مسجلة.' : 'No previous broadcasts recorded.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {broadcastHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-surface border border-surface-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-text-primary truncate">
                                {item.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-medium">
                                {item.recipientSummary || 'General'}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary truncate">{item.body}</p>
                            <span className="text-[10px] text-text-muted mt-0.5 block">
                              {formatLastSeen(item.sentAt)} • {item.successCount || 0} تم تسليمه
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {/* Re-send button */}
                            <button
                              onClick={() => handleReSendBroadcast(item)}
                              className="px-2.5 py-1 rounded-xl bg-surface-elevated hover:bg-surface-border text-accent-blue text-xs font-semibold border border-surface-border transition-colors flex items-center gap-1"
                              title={language === 'ar' ? 'إعادة الإرسال' : 'Re-send'}
                            >
                              <RotateCcw size={12} />
                              <span>{language === 'ar' ? 'إعادة الإرسال' : 'Re-send'}</span>
                            </button>

                            {/* Delete from history button */}
                            <button
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="p-1.5 rounded-xl text-text-muted hover:text-rose-400 hover:bg-surface-elevated transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════ TAB 4: MAINTENANCE MODE ════════════════════ */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                {/* Maintenance Mode Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    maintenanceMode
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-surface border-surface-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          maintenanceMode
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-surface-elevated text-text-muted'
                        }`}
                      >
                        <Wrench size={20} className={maintenanceMode ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">
                          {t('maintenanceModeTitle')}
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          {t('maintenanceModeDesc')}
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {maintenanceMode && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>{t('maintenanceActiveAlert')}</span>
                    </div>
                  )}
                </div>

                {/* Maintenance Message Inputs */}
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-text-muted">
                    {t('maintenanceMessageLabel')}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[11px] text-text-muted mb-1">باللغة العربية</span>
                      <textarea
                        rows={3}
                        value={maintenanceMsgAr}
                        onChange={(e) => setMaintenanceMsgAr(e.target.value)}
                        placeholder="مثال: نقوم حالياً بترقية الخوادم وإضافة ميزات جديدة. سنعود خلال دقائق!"
                        className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs sm:text-sm text-text-primary focus:border-amber-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-text-muted mb-1">In English</span>
                      <textarea
                        rows={3}
                        value={maintenanceMsgEn}
                        onChange={(e) => setMaintenanceMsgEn(e.target.value)}
                        placeholder="e.g. Upgrading servers and adding new features. Back in a few minutes!"
                        className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs sm:text-sm text-text-primary focus:border-amber-500 outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveMaintenance}
                  disabled={savingMaintenance}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2"
                >
                  {savingMaintenance ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>
                    {language === 'ar' ? 'حفظ إعدادات الصيانة' : 'Save Maintenance Settings'}
                  </span>
                </button>

                {/* Emergency Kick All Section */}
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertOctagon size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {language === 'ar'
                        ? 'إجراءات الطوارئ: طرد جميع الطلاب دفعة واحدة'
                        : 'Emergency Actions: Kick All Users'}
                    </h4>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {language === 'ar'
                      ? 'يؤدي هذا الزر إلى إنهاء جلسات جميع الطلاب المتصلين فوراً وتسجيل خروجهم (باستثنائك كمسؤول). مفيد قبل الصيانة الشاملة أو التحديثات الكبرى.'
                      : 'Instantly logs out all connected students except Super Admin. Useful before major deployments.'}
                  </p>

                  <button
                    onClick={handleEmergencyKickAll}
                    disabled={kickingAll}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
                  >
                    {kickingAll ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <UserX size={14} />
                    )}
                    <span>
                      {language === 'ar'
                        ? '⚡ تسجيل خروج وطرد جميع الطلاب الآن'
                        : '⚡ Terminate All Student Sessions Now'}
                    </span>
                  </button>
                </div>

                {/* System Info card */}
                <div className="p-4 rounded-2xl bg-surface border border-surface-border/60 space-y-2">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck size={14} className="text-accent-blue" />
                    <span>
                      {language === 'ar' ? 'بيانات النظام السحابي' : 'Cloud System Status'}
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                    <div>
                      Cloud Database: <span className="text-emerald-400 font-semibold">Active</span>
                    </div>
                    <div>
                      FCM Push Service: <span className="text-emerald-400 font-semibold">Active</span>
                    </div>
                    <div>
                      Super Admin:{' '}
                      <span className="text-amber-400 font-semibold">{SUPER_ADMIN_EMAIL}</span>
                    </div>
                    <div>
                      App Version: <span className="text-text-primary font-semibold">2.1.0</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Details Inspection Modal */}
      {selectedUserForDetails && (
        <StudentDetailsModal
          user={selectedUserForDetails}
          onClose={() => setSelectedUserForDetails(null)}
          onKick={(user) => handleKickUser(user)}
          onToggleBan={(user) => handleToggleBan(user)}
          onSendDirectPush={(user) => {
            setActiveTab('push');
            setPushTarget(user.id);
            setPushTitle(language === 'ar' ? `تنبيه خاص لك يا ${user.displayName || 'طالب'}` : 'Direct Notification');
          }}
        />
      )}
    </>
  );
};
