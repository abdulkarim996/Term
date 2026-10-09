import { cloudDeleteChatMessage } from '../../lib/firestore'
import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudDeleteChatSession, cloudUpdateChatSession, cloudAddChatSession, cloudAddChatMessage } from '../../lib/firestore'
import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import { MessageSquare, Sparkles, Send, User, Brain, Zap, Trash2, Edit2, Calendar, CheckSquare, BookOpen, ChevronDown, Plus, AlertCircle, Loader2, Square, Copy, Check, RotateCcw, Image as ImageIcon, X } from 'lucide-react'
import { ChatMessage } from '../../store/dataStore'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useSettingsStore, useUIStore } from '../../store'
import { calculateAcademicSummary } from '../../lib/gpa'
import { pdfjs } from 'react-pdf'

interface AttachedImage {
  base64: string
  mimeType: string
  previewUrl: string
  name: string
}

async function extractTextFromDriveFile(file: any, token: string) {
  try {
    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
    const isGoogleSlides = file.mimeType === 'application/vnd.google-apps.presentation';
    const headers = { Authorization: `Bearer ${token}` };
    
    if (isGoogleDoc || isGoogleSlides) {
      const fetchUrl = `https://www.googleapis.com/drive/v3/files/${file.driveFileId}/export?mimeType=text/plain`;
      const res = await fetch(fetchUrl, { headers });
      if (res.ok) {
        const text = await res.text();
        return text.substring(0, 50000); // Max 50k chars
      }
    } else if (file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const fetchUrl = `https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`;
      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) return '';
      const arrayBuffer = await res.arrayBuffer();
      
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 30); // limit to 30 pages
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText.substring(0, 100000); // Limit to 100k chars
    }
    return '';
  } catch (err) {
    console.error("Error extracting text from file", err);
    return '';
  }
}

async function fetchSupportedModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        return data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));
      }
    }
  } catch (err) {
    console.warn("Error fetching supported models from Google:", err);
  }
  return [];
}

export default function AIScreen() {
  const { t } = useTranslation();
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('default')
  const [showSessionsMenu, setShowSessionsMenu] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash')
  const [availableModelIds, setAvailableModelIds] = useState<string[]>([])
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null)
  const [copiedId, setCopiedId] = useState<string | number | null>(null)
  
  const [streamingMessage, setStreamingMessage] = useState('')

  const { geminiApiKey } = useSettingsStore()
  const activeStudyFile = useUIStore(state => state.activeStudyFile)

  useEffect(() => {
    if (!geminiApiKey) return
    fetchSupportedModels(geminiApiKey).then((models) => {
      if (models && models.length > 0) {
        setAvailableModelIds(models)
        setSelectedModel((prev) => {
          if (models.includes(prev)) return prev
          const best = models.find(m => m.includes('3.5-flash') && !m.includes('lite')) 
            || models.find(m => m.includes('3.5-flash-lite')) 
            || models.find(m => m.includes('3.8-flash')) 
            || models.find(m => m.includes('flash') && !m.includes('tts') && !m.includes('image'))
            || models[0]
          return best || prev
        })
      }
    })
  }, [geminiApiKey])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortStreamRef = useRef(false)

  const allMessages = useDataStore(state => state.messages)
  const messages = allMessages.filter(m => m.sessionId === currentSessionId).sort((a, b) => a.timestamp - b.timestamp)
  const sessions = useDataStore(state => state.chatSessions)
  const tasksCount = useDataStore(state => state.tasks.length)
  const driveFilesCount = useDataStore(state => state.driveFiles.length)

  const stopGeneration = () => {
    abortStreamRef.current = true
  }

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const regenerateLastMessage = () => {
    if (loading) return
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content)
    }
  }

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(t('chooseImageFile') || 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(t('imageTooLarge') || 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      setAttachedImage({
        base64,
        mimeType: file.type || 'image/png',
        previewUrl: dataUrl,
        name: file.name || 'image.png'
      })
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
    e.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          processImageFile(file)
          break
        }
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  
  const deleteSession = async (id: string) => {
    if (confirm(t('confirmDeleteChat'))) {
      await cloudDeleteChatSession(String(id));
      useDataStore.getState().messages.filter((m: any) => m.sessionId === id).forEach((m: any) => cloudDeleteChatMessage(String(m.id)));
      if (currentSessionId === id) {
        createNewSession();
      }
    }
  }

  const renameSession = async (id: string, currentTitle: string) => {
    const newTitle = prompt(t('enterNewName'), currentTitle);
    if (newTitle && newTitle.trim()) {
      await cloudUpdateChatSession(String(id), { title: newTitle.trim() });
    }
  }
  
  const createNewSession = async () => {
    const newId = Date.now().toString()
    await cloudAddChatSession({
      id: newId,
      title: t('newChat'),
      createdAt: Date.now(), updatedAt: Date.now()
    })
    setCurrentSessionId(newId)
    setShowSessionsMenu(false)
  }

  const ensureSessionExists = async (title?: string) => {
    const session = useDataStore.getState().chatSessions.find((s: any) => s.id === currentSessionId)
    if (!session) {
      await cloudAddChatSession({
        id: currentSessionId,
        title: title || t('newChat'),
        createdAt: Date.now(), updatedAt: Date.now()
      })
    } else if (title && session.title === t('newChat')) {
      await cloudUpdateChatSession(String(currentSessionId), { title, updatedAt: Date.now() })
    }
  }

  const QUICK_PROMPTS = [
    { label: t('summarizeTasks'), icon: CheckSquare },
    { label: t('upcomingExamsQ'), icon: Calendar },
    { label: t('explainFiles'), icon: BookOpen },
    { label: t('organizeTime'), icon: Sparkles },
  ]

  const DEFAULT_MODELS = [
    { 
      id: 'gemini-3.5-flash', 
      label: 'Flash 3.5', 
      badge: 'موصى به · سريع ومستقر', 
      icon: Zap, 
      color: 'text-accent-blue', 
      bg: 'bg-accent-blue/10', 
      desc: 'النموذج المعتمد، استجابة سريعة جداً بدون أي تأخير ومثالي لجميع المهام والمحادثات اليومية' 
    },
    { 
      id: 'gemini-3.5-flash-lite', 
      label: 'Flash Lite', 
      badge: 'فوري وخفيف', 
      icon: Sparkles, 
      color: 'text-accent-green', 
      bg: 'bg-accent-green/10', 
      desc: 'فائق السرعة والخفة للمحادثات القصيرة والردود اللحظية بحصص مجانية ضخمة' 
    },
    { 
      id: 'gemini-3.8-flash', 
      label: 'Flash 3.8', 
      badge: 'تفكير متقدم', 
      icon: Brain, 
      color: 'text-accent-purple', 
      bg: 'bg-accent-purple/10', 
      desc: 'ذكاء عميق واستيعاب للمسائل المعقدة والتحليل العميق (قد يستغرق وقتاً إضافياً للتفكير)' 
    }
  ]

  const MODELS = DEFAULT_MODELS

  const currentModel = MODELS.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    label: selectedModel.replace('gemini-', '').replace('-preview', ''),
    badge: 'نشط',
    icon: Zap,
    color: 'text-accent-yellow',
    bg: 'bg-accent-yellow/10',
    desc: 'نموذج نشط ومعتمد من Google AI Studio'
  }

  
  const clearChat = async () => {
    if (window.confirm(t('confirmClearChat'))) {
      useDataStore.getState().messages.filter((m: any) => m.sessionId === currentSessionId).forEach((m: any) => cloudDeleteChatMessage(String(m.id)))
      await cloudDeleteChatSession(String(currentSessionId))
      createNewSession()
    }
  }

  const hasMessages = messages && messages.length > 0

  const sendMessage = async (text: string = input) => {
    const userMsgText = text.trim()
    const imageToSend = attachedImage

    if ((!userMsgText && !imageToSend) || loading) return
    if (!geminiApiKey) {
      alert(t('apiKeyMissing') || 'Please add Gemini API Key in Settings first')
      return
    }

    abortStreamRef.current = false
    setAttachedImage(null)

    if (!hasMessages) {
      const titlePrompt = userMsgText || (imageToSend ? `تحليل صورة: ${imageToSend.name}` : t('newChat'))
      const title = titlePrompt.length > 25 ? titlePrompt.substring(0, 25) + '...' : titlePrompt
      await ensureSessionExists(title)
    } else {
      await ensureSessionExists()
    }

    const recordedContent = userMsgText 
      ? (imageToSend ? `${userMsgText}\n\n📷 [مرفق: ${imageToSend.name}]` : userMsgText)
      : `📷 [مرفق: ${imageToSend?.name || 'صورة'}]`

    const userMsg: ChatMessage = {
      role: 'user',
      content: recordedContent,
      timestamp: Date.now(),
      sessionId: currentSessionId
    }

    await cloudAddChatMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      let history = []
      let expectedRole = 'user'
      for (const m of (messages || [])) {
        const role = m.role === 'assistant' ? 'model' : 'user'
        if (role === expectedRole) {
          history.push({ role, parts: [{ text: m.content || ' ' }] })
          expectedRole = role === 'user' ? 'model' : 'user'
        } else {
          if (history.length > 0) {
            history[history.length - 1].parts[0].text += "\n" + (m.content || ' ')
          }
        }
      }
      if (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop()
      }

      let currentModelId = selectedModel
      let genAI = new GoogleGenerativeAI(geminiApiKey.trim())
      
      // Build Accurate Real-Time Context
      const now = new Date()
      const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayOfWeekIndex = now.getDay() // 0 = Sunday, 6 = Saturday
      const todayArabicDay = arabicDays[dayOfWeekIndex]
      const todayEnglishDay = englishDays[dayOfWeekIndex]
      const todayDateISO = now.toISOString().split('T')[0]
      const todayDateArabic = now.toLocaleDateString('ar-SA')
      const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

      const tasks = useDataStore.getState().tasks.filter((t: any) => !t.completed)
      const events = useDataStore.getState().events.filter((e: any) => new Date(e.startDate || 0) >= new Date(Date.now() - 86400000))
      const subjects = useDataStore.getState().subjects
      const files = useDataStore.getState().driveFiles
      const s = useSettingsStore.getState()

      const profileInfo = `Name: ${s.userName || "Not specified"}\nMajor: ${s.userMajor || "Not specified"}\nSemester: ${s.currentSemester || "Not specified"}`

      // Today's specific classes:
      const todayClasses: string[] = []
      subjects.forEach((sub: any) => {
        if (sub.lectures && Array.isArray(sub.lectures)) {
          sub.lectures.forEach((lec: any) => {
            if (Number(lec.dayOfWeek) === dayOfWeekIndex) {
              todayClasses.push(`- ${sub.name} (${sub.code || ''}): من ${lec.startTime} إلى ${lec.endTime} في القاعة ${lec.location || 'غير محدد'} مع ${sub.instructor || 'المحاضر'}`)
            }
          })
        }
      })

      // Tasks due TODAY vs upcoming:
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const endOfToday = startOfToday + 86400000
      const tasksDueToday: string[] = []
      const upcomingTasksList: string[] = []

      tasks.forEach((t: any) => {
        const linkedSub = subjects.find((sub: any) => sub.id === t.subjectId)
        const subName = linkedSub ? `${linkedSub.name} (${linkedSub.code || ''})` : 'عام'
        if (t.dueDate) {
          const dueTs = new Date(t.dueDate).getTime()
          const dueStr = new Date(t.dueDate).toLocaleDateString('ar-SA')
          if (dueTs >= startOfToday && dueTs <= endOfToday) {
            tasksDueToday.push(`- 🔴 [مستحق اليوم (${todayArabicDay})] ${t.title} لمادة ${subName} ${t.description ? '(' + t.description + ')' : ''}`)
          } else {
            upcomingTasksList.push(`- [تاريخ ${dueStr}] ${t.title} لمادة ${subName} ${t.description ? '(' + t.description + ')' : ''}`)
          }
        } else {
          upcomingTasksList.push(`- ${t.title} لمادة ${subName}`)
        }
      })

      // Events happening today:
      const eventsToday: string[] = []
      events.forEach((e: any) => {
        const start = new Date(e.startDate || 0).getTime()
        const end = new Date(e.endDate || 0).getTime()
        if ((start >= startOfToday && start <= endOfToday) || (start <= startOfToday && end >= startOfToday)) {
          eventsToday.push(`- 🔴 [حدث/موعد مجدول اليوم] ${e.title} ${e.description ? '(' + e.description + ')' : ''}`)
        }
      })

      const userSubjects = subjects.map((sub: any) => {
         let subInfo = `- ${sub.name} (Code: ${sub.code || 'N/A'}, Credits: ${sub.creditHours || 'N/A'}, Instructor: ${sub.instructor || 'N/A'})`
         if (sub.lectures && sub.lectures.length > 0) {
            const scheduleText = sub.lectures.map((l: any) => `${arabicDays[l.dayOfWeek] || l.dayOfWeek} ${l.startTime}-${l.endTime} @ ${l.location || 'Unknown'}`).join(', ')
            subInfo += `\n  Schedule: ${scheduleText}`
         }
         return subInfo
      }).join('\n')

      const userEvents = events.map((e: any) => `- ${e.title}${e.description ? ' (' + e.description + ')' : ''} [${new Date(e.startDate).toLocaleString()} to ${new Date(e.endDate).toLocaleString()}]`).join('\n')
      const userFiles = files.map((f: any) => {
         const sub = subjects.find((sub: any) => sub.id === f.subjectId)
         return `- ${f.name} (Subject: ${sub ? sub.name : 'Unknown'})`
      }).join('\n')

      // Academic Records, GPA & Course Grades
      const semesters = useDataStore.getState().semesters || []
      const gpaSummary = calculateAcademicSummary(
        semesters,
        s.gpaScale,
        s.targetGraduationHours,
        s.baselineGpa,
        s.baselineHours
      )
      let academicInfo = `Grading Scale: ${s.gpaScale}.00\nCumulative GPA: ${gpaSummary.cumulativeGpa.toFixed(2)} / ${s.gpaScale}.00\nCompleted Credit Hours: ${gpaSummary.totalCompletedHours} / ${s.targetGraduationHours} (Progress: ${gpaSummary.progressPercentage}%)\nHonors Standing: ${gpaSummary.honorsTitle || 'None'}`
      if (semesters.length > 0) {
        academicInfo += '\n\nSemesters Breakdown:'
        semesters.forEach((sem: any) => {
          const semCourses = (sem.courses || []).map((c: any) => `    * ${c.name} (${c.creditHours} credits) -> Grade: ${c.grade}`).join('\n')
          academicInfo += `\n- Semester: ${sem.name} [Term GPA: ${sem.termGpa || 'N/A'}]\n${semCourses || '    (No courses listed)'}`
        })
      }
      
      // Smart Active File & PDF Text Extraction Logic
      let appendedFileText = ''
      const lowerInput = userMsgText.toLowerCase()
      let targetDocToRead: any = null

      // 1. If study room has activeStudyFile open and user mentions file/study queries:
      if (activeStudyFile) {
        const mentionsStudyContext = 
          lowerInput.includes('ملف') || lowerInput.includes('سلايد') || lowerInput.includes('شرح') ||
          lowerInput.includes('لخص') || lowerInput.includes('اختبر') || lowerInput.includes('كويز') ||
          lowerInput.includes('هذا') || lowerInput.includes('الحالي') || lowerInput.includes(activeStudyFile.name.toLowerCase().replace(/\.[^/.]+$/, ''))
        if (mentionsStudyContext) {
          targetDocToRead = activeStudyFile
        }
      }

      // 2. Direct filename match in driveFiles
      if (!targetDocToRead) {
        for (const f of files) {
          const rawName = f.name.replace(/\.[^/.]+$/, '').toLowerCase()
          if (rawName.length >= 3 && lowerInput.includes(rawName)) {
            targetDocToRead = f
            break
          }
        }
      }

      // 3. Subject-based matching: match user query with subjects and their files
      if (!targetDocToRead) {
        for (const sub of subjects) {
          const subName = (sub.name || '').toLowerCase()
          const subCode = (sub.code || '').toLowerCase().replace(/\s+/g, '')
          
          const subjectMatches = 
            (subCode.length > 2 && lowerInput.includes(subCode)) ||
            (subName.length > 3 && lowerInput.includes(subName)) ||
            (subName.includes('differential') && (lowerInput.includes('تفاضل') || lowerInput.includes('معادلات'))) ||
            (subName.includes('operations') && (lowerInput.includes('عمليات') || lowerInput.includes('بحوث'))) ||
            (subName.includes('statistics') && lowerInput.includes('إحصاء')) ||
            (subName.includes('planning') && lowerInput.includes('تخطيط')) ||
            (subName.includes('leadership') && (lowerInput.includes('قيادة') || lowerInput.includes('تغيير')))

          if (subjectMatches) {
            const subjectFiles = files.filter((f: any) => f.subjectId === sub.id)
            if (subjectFiles.length > 0) {
              if (lowerInput.includes('واجب') || lowerInput.includes('homework') || lowerInput.includes('hw') || lowerInput.includes('assign')) {
                const hw = subjectFiles.find((f: any) => /hw|homework|assign|واجب/i.test(f.name))
                if (hw) { targetDocToRead = hw; break }
              }
              targetDocToRead = subjectFiles[0]
              break
            }
          }
        }
      }

      // 4. Keyword match across all files
      if (!targetDocToRead) {
        const keywords = lowerInput.split(/\s+/).filter(w => w.length > 3 && !['اليوم', 'عندي', 'كيف', 'ماذا', 'اريد', 'تكلم'].includes(w))
        for (const kw of keywords) {
          const match = files.find((f: any) => f.name.toLowerCase().includes(kw))
          if (match) {
            targetDocToRead = match
            break
          }
        }
      }

      if (targetDocToRead) {
         setStreamingMessage(`جاري قراءة محتوى ملف: ${targetDocToRead.name}...`)
         const token = useSettingsStore.getState().googleAccessToken
         if (token) {
            const extracted = await extractTextFromDriveFile(targetDocToRead, token)
            if (extracted) {
               appendedFileText = `\n\n[FILE CONTEXT FOR: ${targetDocToRead.name}]\n${extracted}\n[/FILE CONTEXT]\n`
            }
         }
      }
      
      const activeFileNotice = activeStudyFile ? `\n[CURRENTLY OPEN IN STUDY ROOM: ${activeStudyFile.name}]` : ''

      const dateAndScheduleBlock = `
=== معلومات اليوم والوقت الحالي (حاسمة ودقيقة 100%) ===
* تاريخ اليوم: ${todayDateISO} (${todayArabicDay} / ${todayEnglishDay})
* الوقت الحالي: ${currentTimeStr}
* اليوم في الأسبوع: ${todayArabicDay} (${todayEnglishDay})

[جدول محاضرات الطالب لليوم (${todayArabicDay})]:
${todayClasses.length > 0 ? todayClasses.join('\n') : `لا توجد محاضرات في الجامعة اليوم (${todayArabicDay} يوم راحة / إجازة / أوف).`}

[مهام وواجبات وعروض تقديمية مستحقة اليوم (${todayArabicDay})]:
${tasksDueToday.length > 0 ? tasksDueToday.join('\n') : 'لا توجد مهام أو واجبات مستحقة التسليم اليوم.'}

[أحداث ومواعيد التقويم لليوم (${todayArabicDay})]:
${eventsToday.length > 0 ? eventsToday.join('\n') : 'لا توجد مواعيد خاصة بالتقويم اليوم.'}
===================================================`

      const sysInst = t('aiInstruction') + `\n\n=== USER CONTEXT ===\n${dateAndScheduleBlock}\n\n[USER PROFILE]\n${profileInfo}\n\n[ACADEMIC RECORDS & GPA]\n${academicInfo}\n\n[ENROLLED SUBJECTS & WEEKLY SCHEDULE]\n${userSubjects || 'No subjects enrolled.'}\n\n[TODAY'S DUE TASKS & UPCOMING TASKS]\n${[...tasksDueToday, ...upcomingTasksList].join('\n') || 'No tasks listed.'}\n\n[UPCOMING CALENDAR EVENTS]\n${userEvents || 'No upcoming events.'}\n\n[UPLOADED FILES / DRIVE]\n${userFiles || 'No files uploaded.'}${activeFileNotice}\n\nتعليمات هامة جداً:\n1. عندما يسأل الطالب 'وش عندي اليوم؟' أو عن جدوله اليومي، اعتمد فوراً وبدقة تامة على قسم [معلومات اليوم والوقت الحالي] واذكر له اليوم الفعلي (${todayArabicDay}) وما إذا كان لديه دوام أو إجازة، واذكر أي مهام أو عروض تقديمية مستحقة اليوم (${todayArabicDay}).\n2. لا تخمن أبداً أياماً أخرى من عندك.\n===================`

      const generateAttempt = async (modelId: string, imgData?: AttachedImage | null) => {
        const promptText = appendedFileText ? (userMsgText + appendedFileText) : userMsgText
        const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: sysInst })
        const chat = model.startChat({ history })
        
        let requestPayload: any
        if (imgData) {
          requestPayload = [
            {
              inlineData: {
                data: imgData.base64,
                mimeType: imgData.mimeType
              }
            },
            { text: promptText || 'يرجى قراءة وتحليل هذه الصورة وشرح كل ما فيها بالتفصيل والإجابة على أي أسئلة أو مسائل بداخلها بدقة.' }
          ]
        } else {
          requestPayload = promptText
        }

        const result = await chat.sendMessageStream(requestPayload)
        
        let generated = ''
        let lastUpdateTime = 0
        
        for await (const chunk of result.stream) {
          if (abortStreamRef.current) {
            break
          }
          generated += chunk.text()
          
          const now = Date.now()
          if (now - lastUpdateTime > 80) {
            setStreamingMessage(generated)
            lastUpdateTime = now
          }
        }
        
        if (!generated && !abortStreamRef.current) {
          generated = "عذراً، لم أتمكن من الحصول على إجابة من الخادم."
        }
        
        return generated
      }
    
      let verifiedList = availableModelIds.length > 0 
        ? availableModelIds 
        : await fetchSupportedModels(geminiApiKey)
      
      let candidateModel = selectedModel
      if (verifiedList.length > 0 && !verifiedList.includes(candidateModel)) {
        const found = verifiedList.find(m => m.includes('3.5-flash') && !m.includes('lite'))
          || verifiedList.find(m => m.includes('3.5-flash-lite'))
          || verifiedList.find(m => m.includes('3.8-flash'))
          || verifiedList.find(m => m.includes('flash') && !m.includes('tts') && !m.includes('image'))
          || verifiedList[0]
        if (found) {
          candidateModel = found
          setSelectedModel(found)
        }
      }

      let fullText = ''
      try {
        fullText = await generateAttempt(candidateModel, imageToSend)
      } catch (err: any) {
        console.warn(`Attempt with ${candidateModel} failed, checking fallbacks:`, err)
        
        // Try other verified flash models silently if candidateModel fails
        const fallbackCandidates = (verifiedList.length > 0 ? verifiedList : ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'])
          .filter(m => m !== candidateModel && m.includes('flash') && !m.includes('tts') && !m.includes('image'))
        
        let recovered = false
        for (const fbModel of fallbackCandidates.slice(0, 3)) {
          try {
            fullText = await generateAttempt(fbModel, imageToSend)
            setSelectedModel(fbModel)
            recovered = true
            break
          } catch (fbErr) {
            console.warn(`Fallback ${fbModel} failed:`, fbErr)
          }
        }

        if (!recovered) {
          throw err
        }
      }

      await cloudAddChatMessage({
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        sessionId: currentSessionId
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      let notice = ''
      if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('Resource has been exhausted')) {
        notice = '⚠️ تم تجاوز حد الطلبات المؤقت لهذا النموذج في Google AI Studio. يرجى الانتظار دقيقة واحدة أو اختيار نموذج آخر.'
      } else if (msg.includes('404') || msg.includes('not found')) {
        notice = '⚠️ النموذج المحدد غير مدعوم على هذا المفتاح حالياً. تم فحص وتحديث قائمة النماذج في حسابك، يرجى إعادة المحاولة الآن.'
      } else if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        notice = '⚠️ مفتاح API غير صالح. يرجى التأكد من نسخه بشكل صحيح من موقع Google AI Studio في صفحة الإعدادات.'
      } else {
        notice = `⚠️ حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي: ${msg}`
      }

      await cloudAddChatMessage({
        role: 'assistant',
        content: notice,
        timestamp: Date.now(),
        sessionId: currentSessionId
      })
    } finally {
      setLoading(false)
      setStreamingMessage('')
    }
  }

const currentSession = sessions.find(s => s.id === currentSessionId)

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 pt-5 pb-3 border-b border-surface-border flex-shrink-0 z-20 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowSessionsMenu(!showSessionsMenu)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <MessageSquare size={16} className="text-accent-purple" />
            </button>
            
            {showSessionsMenu && (
              <div className="absolute top-full mt-2 w-72 bg-surface-elevated border border-surface-border rounded-xl shadow-lg shadow-black/20 overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200 z-50" style={{ insetInlineStart: 0 }}>
                <div className="p-2 border-b border-surface-border/50">
                  <button
                    onClick={createNewSession}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 transition-colors rounded-lg"
                  >
                    <Plus size={16} />{t('newChat')}</button>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {sessions.sort((a, b) => b.createdAt - a.createdAt).map(session => (
                      <div
                        key={session.id}
                        className={`w-full flex items-center justify-between px-2 py-2 text-sm transition-colors rounded-lg ${
                          session.id === currentSessionId 
                            ? 'bg-accent-blue/10 text-accent-blue' 
                            : 'text-text-primary hover:bg-surface-hover'
                        }`}
                      >
                        <div onClick={() => { setCurrentSessionId(session.id); setShowSessionsMenu(false); }} className="flex items-center gap-2 truncate flex-1 text-right cursor-pointer">
                          <MessageSquare size={14} className="opacity-70 flex-shrink-0" />
                          
                          {editingSessionId === session.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingSessionTitle}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditingSessionTitle(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  if (editingSessionTitle.trim()) {
                                    await cloudUpdateChatSession(String(session.id), { title: editingSessionTitle.trim() });
                                  }
                                  setEditingSessionId(null);
                                }
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setEditingSessionId(null);
                                }
                              }}
                              onBlur={async () => {
                                if (editingSessionTitle.trim()) {
                                  await cloudUpdateChatSession(String(session.id), { title: editingSessionTitle.trim() });
                                }
                                setEditingSessionId(null);
                              }}
                              className="w-full bg-surface-elevated border border-accent-blue/50 rounded px-1.5 py-0.5 text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="truncate">{session.title}</span>
                          )}

                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(session.id); setEditingSessionTitle(session.title); }} className="p-1.5 hover:bg-surface-elevated hover:text-accent-blue transition-colors rounded-md opacity-60 hover:opacity-100"><Edit2 size={13} /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="p-1.5 hover:bg-surface-elevated hover:text-accent-red transition-colors rounded-md opacity-60 hover:opacity-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))} </div></div> )}
          </div>
          <div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSessionsMenu(!showSessionsMenu)}>
              <h1 className="text-base font-bold ai-gradient-text truncate max-w-[120px]">
                {currentSession?.title || t('newChat')}
              </h1>
              <ChevronDown size={14} className="text-text-muted" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {tasksCount != null && tasksCount > 0 && (
                <span className="text-[10px] text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded-md">{t('thereIs')} {tasksCount} {t('tasksLabel')}</span>
              )}
              {driveFilesCount != null && driveFilesCount > 0 && (
                <span className="text-[10px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-md">{t('thereIs')} {driveFilesCount} {t('file')}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Model Picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-hover transition-colors ${currentModel.color}`}
            >
              <currentModel.icon size={13} />
              <span className="text-xs font-medium">{currentModel.label}</span>
              <ChevronDown size={12} className="opacity-50" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#121622] border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top z-[100] animate-in fade-in zoom-in-95 duration-200 right-0 sm:right-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id)
                      setShowModelPicker(false)
                    }}
                    className={`w-full flex items-start gap-3 p-3 transition-colors ${
                      selectedModel === m.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                      <m.icon size={15} className={m.color} />
                    </div>
                    <div className="text-start flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-medium ${selectedModel === m.id ? m.color : 'text-text-primary'}`}>
                          {m.label}
                        </p>
                        {m.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-muted font-normal">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed whitespace-normal break-words">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {hasMessages && (
            <button
              onClick={clearChat}
              className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-accent-red transition-all"
            >
              <Trash2 size={15} />
            </button>
          )}
          {!geminiApiKey && (
            <button
              onClick={() => alert(t('gotoSettingsKey'))}
              className="flex items-center gap-1.5 text-xs text-accent-yellow hover:text-yellow-400 transition-colors"
            >
              <AlertCircle size={13} />
              API Key
            </button>
          )}
        </div>
      </div>

      {/* Active Study File Banner */}
      {activeStudyFile && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 bg-accent-blue/10 border border-accent-blue/20 rounded-xl flex items-center justify-between text-xs animate-in fade-in flex-shrink-0">
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            <div className="w-5 h-5 rounded-md bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
              <BookOpen size={12} className="text-accent-blue" />
            </div>
            <div className="truncate">
              <p className="text-[9px] text-text-muted leading-tight truncate">ملف المذاكرة النشط</p>
              <p className="text-[11px] font-semibold text-text-primary truncate">{activeStudyFile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ms-1.5">
            <button
              onClick={() => sendMessage(`لخص لي محتوى ملف "${activeStudyFile.name}" وركز على المفاهيم والأسئلة الهامة.`)}
              disabled={loading}
              className="px-2 py-1 rounded-md bg-accent-blue text-white hover:bg-blue-500 text-[10px] font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              💡 تلخيص
            </button>
            <button
              onClick={() => sendMessage(`اختبرني في محتوى ملف "${activeStudyFile.name}" بـ 3 أسئلة اختيار من متعدد مع شرح الحل.`)}
              disabled={loading}
              className="px-2 py-1 rounded-md bg-surface-elevated hover:bg-surface-hover border border-surface-border text-text-primary text-[10px] font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              ❓ كويز
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pointer-events-auto px-4 py-3 space-y-3" onClick={() => setShowModelPicker(false)}>
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/15 to-accent-purple/15 flex items-center justify-center">
              <Sparkles size={32} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="text-lg font-bold ai-gradient-text mb-1">{t('hello')}!</h2>
              <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">{t('hereToHelp')}. {t('iCanRead')} <span className="text-accent-green font-medium">{t('yourTasks')}</span>{t('and')}<span className="text-accent-yellow font-medium">{t('yourEvents')}</span>{t('and')}<span className="text-accent-blue font-medium">{t('yourFiles')}</span>.</p>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 bg-accent-green/10 text-accent-green px-2 py-1 rounded-lg">
                <Calendar size={11} />{t('tasks')}</span>
              <span className="flex items-center gap-1 bg-accent-yellow/10 text-accent-yellow px-2 py-1 rounded-lg">
                <CheckSquare size={11} />{t('exams')}</span>
              {driveFilesCount != null && driveFilesCount > 0 && (
                <span className="flex items-center gap-1 bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-lg">
                  <BookOpen size={11} /> {driveFilesCount} {t('files')}
                </span>
              )}
            </div>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  className="glass-card p-3 text-right hover:border-accent-blue/30 hover:bg-surface-hover transition-all group"
                >
                  <Icon size={16} className="text-accent-blue mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-text-secondary group-hover:text-text-primary">{label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up group`}
            >
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${currentModel.bg}`}>
                  <currentModel.icon size={13} className={currentModel.color} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-accent-blue text-white rounded-tr-sm'
                    : 'bg-surface-card border border-surface-border text-text-primary rounded-tl-sm shadow-sm'
                  }`}
                >
                  <div dir="rtl" className="prose prose-invert prose-p:text-right prose-headings:text-right prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-white/5">
                    <p className={`text-[10px] ${msg.role === 'user' ? 'text-white/60' : 'text-text-muted'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-[10px]"
                          title="نسخ الرد"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} className="text-accent-green" />
                              <span className="text-accent-green">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                        {idx === messages.length - 1 && !loading && (
                          <button
                            onClick={regenerateLastMessage}
                            className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-[10px]"
                            title="إعادة المحاولة"
                          >
                            <RotateCcw size={11} />
                            <span>إعادة</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
              </div>
  
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-accent-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={13} className="text-accent-blue" />
                </div>
              )}
            </div>
          ))
        )}

        {streamingMessage && (
          <div className="flex gap-2.5 justify-start animate-slide-up">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${currentModel.bg}`}>
              <currentModel.icon size={13} className={currentModel.color} />
            </div>
            <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-surface-card border border-surface-border text-text-primary rounded-tl-sm shadow-sm">
              <div dir="rtl" className="prose prose-invert prose-p:text-right prose-headings:text-right prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{streamingMessage}</ReactMarkdown>
              </div>
              <span className="animate-pulse inline-block w-1.5 h-3.5 mt-1 bg-current"></span>
            </div>
          </div>
        )}

        {loading && !streamingMessage && (
          <div className="flex gap-2.5 justify-start animate-slide-up">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${currentModel.bg}`}>
              <currentModel.icon size={13} className={`${currentModel.color} animate-pulse-soft`} />
            </div>
            <div className="bg-surface-card border border-surface-border rounded-xl2 rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full animate-bounce ${currentModel.color.replace('text-', 'bg-')}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context indicator bar */}
      <div className="px-4 py-1.5 border-t border-surface-border/50 flex items-center justify-between text-[10px] text-text-muted flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>{t('context')}:</span>
          <span className="text-accent-green">✓ {t('upcomingTasks')}</span>
          <span className="text-accent-yellow">✓ {t('eventsAndExams')}</span>
          {activeStudyFile && <span className="text-accent-blue font-medium">✓ {activeStudyFile.name}</span>}
        </div>
        <div className="text-text-muted text-[9px] opacity-70">
          يدعم إرفاق ولصق الصور (Ctrl+V) 📷
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-2 border-t border-surface-border flex-shrink-0">
        {/* Attached Image Preview */}
        {attachedImage && (
          <div className="mb-2 p-1.5 bg-surface-elevated border border-surface-border rounded-xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={attachedImage.previewUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg border border-surface-border flex-shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-medium text-text-primary truncate">{attachedImage.name}</p>
                <p className="text-[10px] text-accent-green">صورة جاهزة للتحليل والشرح 📷</p>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 hover:bg-surface-hover text-text-muted hover:text-accent-red rounded-lg transition-colors flex-shrink-0"
              title="إزالة الصورة"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File input for images */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all flex-shrink-0 active:scale-95"
            title="إرفاق صورة مسألة أو ملف (أو الصق مباشرة بالضغط على Ctrl+V)"
          >
            <ImageIcon size={18} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={attachedImage ? 'اكتب سؤالك أو اطلب شرح الصورة...' : (t('askAi') + '...')}
              className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent-blue/50 transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={loading}
              onClick={() => setShowModelPicker(false)}
            />
          </div>

          {loading ? (
            <button
              onClick={stopGeneration}
              className="w-10 h-10 rounded-xl bg-accent-red/20 text-accent-red hover:bg-accent-red/30 flex items-center justify-center flex-shrink-0 transition-all border border-accent-red/30 animate-pulse active:scale-95"
              title="إيقاف التوليد"
            >
              <Square size={14} className="fill-accent-red" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !attachedImage) || loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                (input.trim() || attachedImage) && !loading
                  ? 'bg-accent-blue text-white hover:bg-blue-500 active:scale-95 shadow-sm'
                  : 'bg-surface-elevated text-text-muted'
              }`}
            >
              <Send size={16} className="rtl-flip" />
            </button>
          )}
        </div>
        <div className="text-center mt-1.5 text-[9px] text-text-muted">
          Enter {t('toSendOr')} Shift+Enter {t('forNewLine')}
        </div>
      </div>
    </div>
  )
}
