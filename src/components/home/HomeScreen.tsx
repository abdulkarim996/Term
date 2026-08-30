// @ts-nocheck
import { useTranslation } from '../../hooks/useTranslation'
import { useDataStore } from '../../store/dataStore'
import React, { useState } from 'react'
import {
  BookOpen, Calendar, CheckSquare, AlertCircle,
  Clock, MapPin, ChevronRight, Plus, Sparkles,
  TrendingUp, Target, Coffee
} from 'lucide-react'
import { isToday, isSameDay, formatDateEn } from '../../lib/utils'
import { useUIStore, useSettingsStore } from '../../store'
import AddTaskModal from '../tasks/AddTaskModal'

export default function HomeScreen() {
  const { t, language } = useTranslation();
  const { setActiveTab, setShowAddTask } = useUIStore()
  const { userName } = useSettingsStore()
  const now = Date.now()

  const today = new Date();
  const allEvents = useDataStore(state => state.events)
  const subjects = useDataStore(state => state.subjects);
  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [s.id, s]));
  
  const todayEvents = (() => {
    const todayDayOfWeek = today.getDay();
    const generatedLectures = [];
    if (subjects) {
      subjects.forEach(subject => {
        if (subject.lectures) {
          subject.lectures.forEach(lec => {
            if (lec.dayOfWeek === todayDayOfWeek) {
              const [startH, startM] = lec.startTime.split(':').map(Number);
              const [endH, endM] = lec.endTime.split(':').map(Number);
              const startDt = new Date(today);
              startDt.setHours(startH, startM, 0, 0);
              const endDt = new Date(today);
              endDt.setHours(endH, endM, 0, 0);
              generatedLectures.push({
                id: `lec_${subject.id}_${today.getTime()}_${lec.startTime}`,
                isLecture: true,
                title: subject.name,
                type: 'lecture',
                startDate: startDt.getTime(),
                endDate: endDt.getTime(),
                subjectId: subject.id,
                location: lec.location,
                code: subject.code,
                isGenerated: true
              });
            }
          });
        }
      });
    }
    const dbToday = allEvents.filter(e => {
      if (!e.startDate) return false;
      const ed = new Date(e.startDate);
      return ed.toDateString() === today.toDateString();
    });
    return [...dbToday, ...generatedLectures].sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
  })();

  

  const allTasks = useDataStore(state => state.tasks)
  const urgentTasks = allTasks.filter(t => !t.completed).sort((a, b) => {
    const aDue = a.dueDate || Infinity
    const bDue = b.dueDate || Infinity
    return aDue - bDue
  }).slice(0, 3)

  const upcomingExams = allEvents.filter(e => e.type === 'exam' && e.startDate >= today.getTime()).sort((a, b) => (a.startDate || 0) - (b.startDate || 0)).slice(0, 2)

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedToday = allTasks.filter(t => t.completed && t.updatedAt >= startOfDay.getTime()).length

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 5) return t('goodNight')
    if (h < 12) return t('goodMorning')
    if (h < 17) return t('goodEvening')
    return t('goodEvening')
  }

  const getDayName = () => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', calendar: 'gregory' })
  }

  const getDateString = () => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      calendar: 'gregory'
    })
  }

  const getEventTypeColor = (type: string, subjectId?: number) => {
    if (subjectId && subjectMap[subjectId]) return subjectMap[subjectId].color
    switch (type) {
      case 'exam': return '#f2564a'
      case 'lecture': return '#4f8ef7'
      case 'assignment': return '#f5c842'
      case 'study': return '#9b7bea'
      default: return '#4ecdc4'
    }
  }

  const getEventIcon = (type: string, color: string) => {
    const props = { size: 18, color: color };
    switch (type) {
      case 'exam': return <AlertCircle {...props} />
      case 'lecture': return <BookOpen {...props} />
      case 'assignment': return <CheckSquare {...props} />
      case 'study': return <Target {...props} />
      default: return <Calendar {...props} />
    }
  }

  const getDueDiff = (ts: number) => {
    const diff = ts - now
    const days = Math.floor(diff / 86400000)
    if (days === 0) return t('today')
    if (days === 1) return t('tomorrow')
    return `${t('after')} ${days} ${t('days')}`
  }

  const totalTasks = urgentTasks?.length ?? 0
  const progressPercent = totalTasks > 0
    ? Math.round(((completedToday ?? 0) / (totalTasks + (completedToday ?? 0))) * 100)
    : 0

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm font-medium">{t('noLecturesToday')}</p>
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2">
            {getGreeting()}{userName ? ` ${userName}` : ''} 
            <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>
          <div 
            className="text-text-secondary text-sm mt-2 flex items-center leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t('homeSubtitle', { 
              lectures: `<span class="inline-flex items-center justify-center bg-accent-blue/10 text-accent-blue font-bold px-2 py-0.5 rounded-md text-xs mx-1 border border-accent-blue/20 shadow-sm">${todayEvents?.length ?? 0}</span>`, 
              tasks: `<span class="inline-flex items-center justify-center bg-accent-yellow/10 text-accent-yellow font-bold px-2 py-0.5 rounded-md text-xs mx-1 border border-accent-yellow/20 shadow-sm">${totalTasks}</span>` 
            }) }}
          />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowAddTask(true)}
            className="w-9 h-9 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      
      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <a 
            href={settings.bannerUrl || "https://stuss.nbu.edu.sa/StudentSelfService"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-card flex items-center justify-center gap-2 p-3 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors"
        >
          {t('banner') || 'Banner'}
        </a>
        <a 
            href={settings.blackboardUrl || "https://lms.nbu.edu.sa/webapps/login/"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-card flex items-center justify-center gap-2 p-3 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors"
        >
          {t('blackboard') || 'Blackboard'}
        </a>
      </div>

      {/* Daily Progress Card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent-purple" />
            <span className="text-sm font-medium text-text-primary">{t('completedTasksSub')}</span>
          </div>
          <span className="text-sm font-semibold text-accent-blue">{progressPercent}%</span>
        </div>
        <div className="w-full bg-surface-border rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-accent-blue to-accent-purple h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <CheckSquare size={12} className="text-accent-green" />
            <span>{completedToday ?? 0} {t('completed')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={12} className="text-accent-yellow" />
            <span>{totalTasks} {t('remaining')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar size={12} className="text-accent-blue" />
            <span>{todayEvents?.length ?? 0} {t('lecture')}</span>
          </div>
        </div>
      </div>

      {/* Today's Lectures */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">{t('todayLectures')}</h2>
          </div>
          <button
            onClick={() => setActiveTab('calendar')}
            className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-400 transition-colors"
          >{t('viewAll')}<ChevronRight size={12} className="rtl-flip" />
          </button>
        </div>

        {(!todayEvents || todayEvents.length === 0) ? (
          <div className="glass-card p-6 text-center">
            <Coffee size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-text-muted text-sm">   </p>
            <p className="text-text-muted/60 text-xs mt-1">{t("emptyDay")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event) => {
              const color = getEventTypeColor(event.type, event.subjectId)
              const sub = event.subjectId ? subjectMap[event.subjectId] : null
              const isPast = event.endDate < now
              const isNow = event.startDate <= now && event.endDate > now

              return (
                <div
                  key={event.id}
                  className={`glass-card p-3.5 flex items-start gap-3 transition-all ${isPast ? 'opacity-50' : ''}`}
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="text-lg leading-none mt-0.5">
                    {getEventIcon(event.type, color)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-sm leading-snug ${isPast ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {event.title}
                      </p>
                      {isNow && (
                        <span className="flex-shrink-0 badge bg-accent-green/10 text-accent-green border border-accent-green/20">{t('now')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock size={11} />
                        {new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <MapPin size={11} />
                          {event.location}
                        </span>
                      )}
                      {sub && (
                        <span className="flex items-center gap-1 text-xs" style={{ color }}>
                          <span className="subject-color-dot" style={{ backgroundColor: color }} />
                          {sub.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Urgent Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-accent-yellow" />
            <h2 className="text-sm font-semibold text-text-primary">{t('urgentTasksTitle')}</h2>
          </div>
          <button
            onClick={() => setActiveTab('tasks')}
            className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-400 transition-colors"
          >{t('viewAll')}<ChevronRight size={12} className="rtl-flip" />
          </button>
        </div>

        {(!urgentTasks || urgentTasks.length === 0) ? (
          <div className="glass-card p-5 text-center">
            <CheckSquare size={28} className="mx-auto text-accent-green mb-2" />
            <p className="text-text-muted text-sm">{t("noUrgentTasksIn")} 7 {t("days")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentTasks.slice(0, 4).map((task) => {
              const sub = task.subjectId ? subjectMap[task.subjectId] : null
              const color = sub?.color
              const priorityColor = task.priority === 'high' ? '#f2564a' : task.priority === 'medium' ? '#f5c842' : '#52d98b'
              const isOverdue = task.dueDate && task.dueDate < now

              return (
                <div
                  key={task.id}
                  className="glass-card p-3.5 flex items-center gap-3 cursor-pointer hover:bg-surface-hover transition-all"
                  onClick={() => setActiveTab('tasks')}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priorityColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.isStudyBlock ? 'text-accent-purple' : 'text-text-primary'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sub && (
                        <span className="text-xs" style={{ color: color }}>
                          {sub.name}
                        </span>
                      )}
                      {task.isStudyBlock && (
                        <span className="badge bg-accent-purple/10 text-accent-purple border border-accent-purple/20 text-[10px]">{t('studySession')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium ${isOverdue ? 'text-accent-red' : 'text-text-muted'}`}>
                      {task.dueDate ? getDueDiff(task.dueDate) : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Upcoming Exams */}
      {upcomingExams && upcomingExams.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-accent-red" />
            <h2 className="text-sm font-semibold text-text-primary">{t('upcomingExams')}</h2>
          </div>
          <div className="space-y-2">
            {upcomingExams.map((exam) => {
              const sub = exam.subjectId ? subjectMap[exam.subjectId] : null
              const daysLeft = Math.ceil((exam.startDate - now) / 86400000)

              return (
                <div
                  key={exam.id}
                  className="glass-card p-3.5 flex items-center gap-3"
                  style={{ borderLeft: `3px solid #f2564a` }}
                >
                  <span className="text-lg">??</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{exam.title}</p>
                    {sub && <p className="text-xs text-text-muted mt-0.5">{getDayName()} {getDateString()}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-accent-red">{daysLeft}</p>
                    <p className="text-[10px] text-text-muted">{t('days')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Quick AI Prompt */}
      <button
        onClick={() => setActiveTab('ai')}
        className="w-full glass-card p-4 flex items-center gap-3 hover:border-accent-purple/30 hover:bg-surface-hover transition-all group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center group-hover:from-accent-blue/30 group-hover:to-accent-purple/30 transition-all">
          <Sparkles size={18} className="text-accent-purple" />
        </div>
        <div className="text-right flex-1">
          <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{t("askAi")}</p>
          <p className="text-xs text-text-muted">{t("aiPlaceholder")}</p>
        </div>
        <ChevronRight size={16} className="text-text-muted group-hover:text-accent-blue transition-all rtl-flip" />
      </button>

      <AddTaskModal />
    </div>
  )
}
