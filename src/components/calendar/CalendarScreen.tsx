import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useUIStore } from '../../store'
import { useDataStore } from '../../store/dataStore'
import { CalendarEvent } from '../../store/dataStore'
import { cloudAddEvent } from '../../lib/firestore'
import * as XLSX from 'xlsx'
import AddEventModal from './AddEventModal'
import EditEventModal from './EditEventModal'
import Modal from '../ui/Modal'
import { Clock, MapPin, AlignLeft, Edit2 } from 'lucide-react'
import AddTaskModal from '../tasks/AddTaskModal'
import TimeGrid from './TimeGrid'
import { isToday, isSameDay, parseExcelSchedule } from '../../lib/utils'

const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarScreen() {
  const { t, language } = useTranslation();
  const DAYS_AR = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];

  const { calendarView, setCalendarView, selectedDate, setSelectedDate, showToast } = useUIStore()
  const { events, subjects, tasks } = useDataStore()

  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [viewingItem, setViewingItem] = useState<{type: 'task'|'event', data: any} | null>(null)

  const subjectMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (subjects) {
      subjects.forEach(s => map[s.id] = s)
    }
    return map
  }, [subjects])

  const allEvents = useMemo(() => {
    const allTasks = tasks.filter(t => t.dueDate).map(t => ({
      ...t,
      type: 'task',
      startDate: new Date(t.dueDate!).getTime(),
      endDate: new Date(t.dueDate!).getTime() + (60 * 60 * 1000)
    }));
    return [...events, ...allTasks]
  }, [events, tasks])

  const displayedWeeklyEvents = useMemo(() => {
    const currentWeekStart = new Date(selectedDate);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    currentWeekStart.setHours(0,0,0,0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23,59,59,999);

    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.startDate || event.createdAt || Date.now());
      return eventDate >= currentWeekStart && eventDate <= currentWeekEnd;
    });
    
    const weekTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= currentWeekStart && taskDate <= currentWeekEnd;
    }).map(task => ({
      ...task,
      type: 'task',
      startDate: new Date(task.dueDate!).getTime(),
      endDate: new Date(task.dueDate!).getTime() + (60 * 60 * 1000) // 1 hour duration default
    }));

    return [...weekEvents, ...weekTasks];
  }, [events, tasks, selectedDate]);


  const getEventColor = (event: CalendarEvent) => {
  const { t } = useTranslation();
    if (event.subjectId && subjectMap[event.subjectId]) return subjectMap[event.subjectId].color
    if (event.color) return event.color
    switch (event.type) {
      case 'exam': return '#f2564a'
      case 'assignment': return '#0097a7'
      case 'lecture': return '#4285f4'
      default: return '#757575'
    }
  }

  const navigatePrev = () => {
    const d = new Date(selectedDate)
    if (calendarView === 'day') d.setDate(d.getDate() - 1)
    if (calendarView === 'week') d.setDate(d.getDate() - 7)
    if (calendarView === 'month') d.setMonth(d.getMonth() - 1)
    setSelectedDate(d.getTime())
  }

  const navigateNext = () => {
    const d = new Date(selectedDate)
    if (calendarView === 'day') d.setDate(d.getDate() + 1)
    if (calendarView === 'week') d.setDate(d.getDate() + 7)
    if (calendarView === 'month') d.setMonth(d.getMonth() + 1)
    setSelectedDate(d.getTime())
  }

  const getHeaderLabel = () => {
    const d = new Date(selectedDate)
    const fmt = (opts) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', { ...opts, calendar: 'gregory' }).format(d);
    if (calendarView === 'day') return `${DAYS_AR[d.getDay()]} ${d.getDate()} ${fmt({ month: 'long', year: 'numeric' })}`
    if (calendarView === 'week') return `${t('week')} ${d.getDate()} ${fmt({ month: 'long' })}`
    return fmt({ month: 'long', year: 'numeric' })
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
      const parsed = parseExcelSchedule(data)
      for (const ev of parsed) {
        await cloudAddEvent({ ...ev, type: ev.type ?? 'lecture', createdAt: Date.now() } as CalendarEvent)
      }
      showToast(`${t('imported')} ${parsed.length} ${t('eventFromFile')}`, 'success')
    } catch {
      showToast(t('importError'), 'error')
    }
    e.target.value = ''
  }

  const DayView = () => (
    <div className="relative w-full h-[70vh] overflow-auto hide-scrollbar border border-surface-border rounded-xl bg-surface-card">
      <div className="w-full flex flex-col">
        <TimeGrid 
          events={allEvents} 
          selectedDate={selectedDate} 
          view="day" 
          onEventClick={(ev) => setViewingItem({ type: ev.type === 'task' ? 'task' : 'event', data: ev })} 
          getEventColor={getEventColor} subjects={subjects} 
        />
      </div>
    </div>
  )

  const WeekView = () => (
    <div className="relative w-full h-[70vh] overflow-auto hide-scrollbar border border-surface-border rounded-xl bg-surface-card">
      <div className="min-w-[900px] w-full flex flex-col">
        {/* Header Row */}
        <div className="flex sticky top-0 z-30 bg-background shadow-sm border-b border-surface-border">
          <div className="w-16 shrink-0 sticky left-0 z-40 bg-background border-r border-surface-border flex items-center justify-center text-xs text-text-muted font-bold">{t('time')}</div>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - d.getDay() + i);
            const isT = isToday(d.getTime());
            return (
              <div key={i} className={`flex-1 min-w-[120px] text-center text-[11px] font-medium py-2 ${isT ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted'}`}>
                {DAYS_EN[d.getDay()]} {d.getDate()}
              </div>
            )
          })}
        </div>
        {/* Grid Body */}
        <TimeGrid 
          events={displayedWeeklyEvents} 
          selectedDate={selectedDate} 
          view="week" 
          onEventClick={(ev) => setViewingItem({ type: ev.type === 'task' ? 'task' : 'event', data: ev })} 
          getEventColor={getEventColor} subjects={subjects} 
        />
      </div>
    </div>
  )

  const MonthView = () => {
    const startOfMonth = new Date(selectedDate);
    startOfMonth.setDate(1);
    const startDay = startOfMonth.getDay();
    const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
    
    // Create an array of blank days for padding
    const blanks = Array.from({ length: startDay }, (_, i) => i);
    // Create an array of actual days
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthlyTasksOnly = tasks || [];

    return (
      <div className="w-full h-full flex flex-col bg-surface-card border border-surface-border rounded-xl overflow-hidden p-2 md:p-4">
        {/* أيام الأسبوع */}
        <div className="grid grid-cols-7 gap-px mb-2 text-center font-bold text-xs md:text-sm text-text-muted border-b border-surface-border pb-2">
          {DAYS_EN.map(d => <div key={d}>{d}</div>)}
        </div>
        {/* شبكة الأيام */}
        <div className="grid grid-cols-7 auto-rows-fr gap-1 md:gap-2 flex-grow">
          {blanks.map(b => <div key={`blank-${b}`} className="p-1 md:p-2 opacity-30" />)}
          {days.map(d => {
            const currentDt = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), d);
            const isT = isToday(currentDt.getTime());
            
            const currentCellDate = new Date(currentDt).setHours(0,0,0,0);
            const dayTasks = monthlyTasksOnly.filter(task => {
              // Tasks have dueDate or createdAt
              const taskDate = new Date(task.dueDate || task.createdAt).setHours(0,0,0,0);
              return taskDate === currentCellDate;
            });
            
            return (
              <div key={d} className={`border border-surface-border/50 rounded-md p-1 md:p-2 min-h-[80px] md:min-h-[100px] transition ${isT ? 'bg-accent-blue/5 border-accent-blue/30' : 'hover:bg-surface-hover'}`}>
                <span className={`text-xs md:text-sm font-semibold ${isT ? 'text-accent-blue' : 'text-text-primary'}`}>{d}</span>
                <div className="mt-1 flex flex-col gap-1 text-[10px] md:text-xs">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id} 
                      onClick={(e) => { e.stopPropagation(); setViewingItem({ type: 'task', data: task }); }} 
                      className="cursor-pointer text-xs bg-blue-500/20 text-blue-400 rounded p-1 mb-1 truncate hover:opacity-80 transition"
                    >
                      {task.title || decodeURIComponent('%D9%85%D9%87%D9%85%D8%A9')}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }


  const DetailsModal = () => {
    if (!viewingItem) return null;
    const { type, data } = viewingItem;
    
    return (
      <Modal isOpen={true} onClose={() => setViewingItem(null)} title={decodeURIComponent('%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84')}>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-1">{data.title || data.name}</h2>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${type === 'task' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-yellow/20 text-accent-yellow'}`}>
                {type === 'task' ? decodeURIComponent('%D9%85%D9%87%D9%85%D8%A9') : decodeURIComponent('%D9%85%D8%AD%D8%A7%D8%B6%D8%B1%D8%A9 / %D8%AD%D8%AF%D8%AB')}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            {(data.startDate || data.dueDate) && (
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <Clock size={16} className="text-text-muted" />
                <span>
                  {new Date(data.startDate || data.dueDate).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { calendar: 'gregory' })} 
                  {data.endDate ? ` - ${new Date(data.endDate).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}` : ''}
                </span>
              </div>
            )}
            
            {data.location && (
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <MapPin size={16} className="text-text-muted" />
                <span>{data.location}</span>
              </div>
            )}
            
            {(data.description || data.notes) && (
              <div className="flex items-start gap-2 text-sm text-text-primary mt-4">
                <AlignLeft size={16} className="text-text-muted mt-0.5" />
                <p className="whitespace-pre-wrap">{data.description || data.notes}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-border">
            <button
              onClick={() => setViewingItem(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-hover text-text-primary transition-colors"
            >
              {decodeURIComponent('%D8%A5%D8%BA%D9%84%D8%A7%D9%82')}
            </button>
            <button
              onClick={() => {
                if (type === 'task') setEditingTask(data);
                else setEditingEvent(data);
                setViewingItem(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl text-sm font-medium shadow-lg shadow-accent-blue/30 transition-transform active:scale-95 hover:bg-accent-blue/90"
            >
              <Edit2 size={16} />
              {decodeURIComponent('%D8%AA%D8%B9%D8%AF%D9%8A%D9%84')}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-4 md:gap-6 animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('academicCalendar')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('organizeTimeLec')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center text-text-muted hover:text-accent-blue transition-colors cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
            <span className="font-bold text-lg leading-none">X</span>
          </label>
          <button
            onClick={() => setShowAddEvent(true)}
            className="w-9 h-9 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 bg-surface-card rounded-xl p-1 border border-surface-border">
        {(['day', 'week', 'month'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setCalendarView(view)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${calendarView === view ? 'bg-accent-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            {view === 'day' ? t('daily') : view === 'week' ? t('weekly') : t('monthly')}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={navigatePrev} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-all">
          <ChevronRight size={18} />
        </button>
        <button onClick={() => setSelectedDate(Date.now())} className="text-sm font-semibold text-text-primary hover:text-accent-blue transition-colors text-center flex-1 mx-2">
          {getHeaderLabel()}
        </button>
        <button onClick={navigateNext} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-all">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Calendar Content */}
      <div className="animate-fade-in flex-1 min-h-[500px]">
        {calendarView === 'day' && <DayView />}
        {calendarView === 'week' && <WeekView />}
        {calendarView === 'month' && <MonthView />}
      </div>

      {/* Modals */}
      {showAddEvent && <AddEventModal isOpen={showAddEvent} onClose={() => setShowAddEvent(false)} />}
      {editingEvent && <EditEventModal isOpen={!!editingEvent} event={editingEvent} onClose={() => setEditingEvent(null)} />}
      {editingTask && <AddTaskModal isOpen={!!editingTask} editTask={editingTask} onClose={() => setEditingTask(null)} />}
      <DetailsModal />
    </div>
  )
}
