// @ts-nocheck
import { cloudAddTask } from '../lib/firestore'
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
// Study block generation logic
// When an exam is added, auto-generate two locked study blocks on the two days before it

import { useDataStore } from '../store/dataStore'

export const SUBJECT_COLORS = [
  '#4f8ef7', '#9b7bea', '#4ecdc4', '#52d98b',
  '#f5c842', '#f2564a', '#f472b6', '#fb923c',
  '#38bdf8', '#a78bfa', '#34d399', '#fbbf24',
]

export function getRandomSubjectColor(): string {
  return SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function addDays(ts: number, days: number): number {
  return ts + days * 24 * 60 * 60 * 1000
}

export function formatDate(ts: number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('ar-SA', {
    calendar: 'gregory',
    ...opts }).format(new Date(ts))
}

export function formatDateEn(ts: number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', opts).format(new Date(ts))
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db2 = new Date(b)
  return da.getFullYear() === db2.getFullYear() &&
    da.getMonth() === db2.getMonth() &&
    da.getDate() === db2.getDate()
}

export function isToday(ts: number): boolean {
  return isSameDay(ts, Date.now())
}

export function getWeekDays(anchorTs: number): number[] {
  const d = new Date(anchorTs)
  const day = d.getDay() // 0=Sun
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - day)
  sunday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => sunday.getTime() + i * 86400000)
}

export function getMonthDays(year: number, month: number): number[] {
  // Returns all days in month, padded to full weeks (starting Sunday)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const endPad = 6 - lastDay.getDay()
  const days: number[] = []

  for (let i = startPad; i > 0; i--) {
    days.push(new Date(year, month, 1 - i).getTime())
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d).getTime())
  }
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i).getTime())
  }
  return days
}

// Core Algorithm: Generate study blocks for an exam
export async function generateStudyBlocksForExam(examEvent: CalendarEvent): Promise<void> {
  if (examEvent.type !== 'exam' || !examEvent.id) return

  // Remove existing auto-generated study blocks for this exam
  const existing = useDataStore.getState().tasks.filter((t: any) => t.examId === examEvent.id && t.isStudyBlock === true)
  existing.forEach((t: any) => cloudDeleteTask(String(t.id)))

  const examStart = startOfDay(examEvent.startDate)

  // Generate study tasks for the 2 days BEFORE the exam
  for (let i = 2; i >= 1; i--) {
    const dayTs = addDays(examStart, -i)
    const dayLabel = i === 2 ? 'قبل يومين' : 'غداً'

    const studyTask: Task = {
      title: `جلسة دراسة ${examEvent.title} - ${dayLabel}`,
      description: `جلسة دراسة تلقائية تم إنشاؤها لاختبار: ${examEvent.title}. راجع المادة وركز على المواضيع المهمة.`,
      subjectId: examEvent.subjectId,
      priority: 'high',
      dueDate: dayTs,
      completed: false,
      isStudyBlock: true,
      examId: examEvent.id,
      createdAt: Date.now(),
      updatedAt: Date.now() }
    await cloudAddTask(studyTask)
  }
}

// Parse ICS file content
export function parseICS(content: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  let current: Record<string, string> = {}
  let inEvent = false

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
    } else if (line === 'END:VEVENT') {
      inEvent = false
      if (current.DTSTART && current.SUMMARY) {
        const parseICSDate = (s: string): number => {
          const clean = s.replace(/[TZ]/g, '').replace(/^.*:/, '')
          if (clean.length === 8) {
            return new Date(
              parseInt(clean.slice(0, 4)),
              parseInt(clean.slice(4, 6)) - 1,
              parseInt(clean.slice(6, 8))
            ).getTime()
          }
          return new Date(s.replace(/^.*:/, '')).getTime()
        }

        events.push({
          title: current.SUMMARY || 'Event',
          description: current.DESCRIPTION,
          location: current.LOCATION,
          startDate: parseICSDate(current.DTSTART),
          endDate: current.DTEND ? parseICSDate(current.DTEND) : parseICSDate(current.DTSTART) + 3600000,
          type: 'other',
          createdAt: Date.now() })
      }
    } else if (inEvent) {
      const idx = line.indexOf(':')
      if (idx > -1) {
        const key = line.slice(0, idx).split(';')[0]
        const value = line.slice(idx + 1)
        current[key] = value
      }
    }
  }

  return events
}

// Parse Excel schedule
export function parseExcelSchedule(data: unknown[][]): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = []
  if (!data || data.length < 2) return events

  const headers = (data[0] as string[]).map((h) => String(h).toLowerCase().trim())
  const titleIdx = headers.findIndex((h) => h.includes('arabic') || h.includes('arabic') || h.includes('arabic') || h.includes('arabic'))
  const dateIdx = headers.findIndex((h) => h.includes('arabic') || h.includes('arabic'))
  const timeIdx = headers.findIndex((h) => h.includes('arabic') || h.includes('arabic'))
  const typeIdx = headers.findIndex((h) => h.includes('arabic') || h.includes('arabic'))

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[]
    if (!row[titleIdx]) continue

    let ts = Date.now()
    if (dateIdx > -1 && row[dateIdx]) {
      const d = new Date(row[dateIdx])
      if (!isNaN(d.getTime())) ts = d.getTime()
    }

    events.push({
      title: String(row[titleIdx]),
      startDate: ts,
      endDate: ts + 3600000,
      type: typeIdx > -1 ? (String(row[typeIdx]).toLowerCase() as CalendarEvent['type']) : 'lecture',
      createdAt: Date.now() })
  }
  return events
}

// Build RAG context from DB
export async function buildRAGContext(): Promise<string> {
  const [subjects, tasks, events] = await Promise.all([
    useDataStore.getState().subjects,
    useDataStore.getState().tasks.slice().sort((a: any, b: any) => (a.dueDate || 0) - (b.dueDate || 0)).slice(0, 50),
    useDataStore.getState().events.slice().sort((a: any, b: any) => (a.startDate || 0) - (b.startDate || 0)).slice(0, 100),
  ])

  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]))
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  const tomorrowTs = todayTs + 86400000

  const todayEvents = events.filter((e) => isSameDay(e.startDate, now))
  const tomorrowEvents = events.filter((e) => isSameDay(e.startDate, now + 86400000))
  const upcomingTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate >= todayTs)
  const upcomingExams = events.filter((e) => e.type === 'exam' && e.startDate >= now)

  let ctx = `## Student Dashboard Context\n`
  ctx += `Current Date/Time: ${new Date().toLocaleString('ar-SA', { calendar: 'gregory' })}\n\n`

  ctx += `### Subjects\n`
  subjects.forEach((s) => {
    ctx += `- ${s.name}${s.code ? ` (${s.code})` : ''}\n`
  })

  ctx += `\n### Today's Schedule (${new Date().toLocaleDateString()})\n`
  if (todayEvents.length === 0) ctx += `- No events today\n`
  todayEvents.forEach((e) => {
    ctx += `- [${e.type}] ${e.title} - ${new Date(e.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} at ${e.location || 'N/A'}\n`
  })

  ctx += `\n### Tomorrow's Schedule\n`
  if (tomorrowEvents.length === 0) ctx += `- No events tomorrow\n`
  tomorrowEvents.forEach((e) => {
    ctx += `- [${e.type}] ${e.title} - ${new Date(e.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`
  })

  ctx += `\n### Upcoming Tasks (next 14 days)\n`
  upcomingTasks.slice(0, 20).forEach((t) => {
    const sub = t.subjectId ? subjectMap[t.subjectId] : null
    ctx += `- [${t.priority}] ${t.title}${sub ? ` (${sub})` : ''} - Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}${t.isStudyBlock ? ' [STUDY BLOCK - LOCKED]' : ''}\n`
  })

  ctx += `\n### Upcoming Exams\n`
  upcomingExams.slice(0, 10).forEach((e) => {
    const sub = e.subjectId ? subjectMap[e.subjectId] : null
    ctx += `- ${e.title}${sub ? ` (${sub})` : ''} - ${new Date(e.startDate).toLocaleDateString()}\n`
  })

  return ctx
}



