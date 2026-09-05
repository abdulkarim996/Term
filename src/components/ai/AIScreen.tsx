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
import { MessageSquare, Sparkles, Send, User, Brain, Zap, Trash2, Edit2, Calendar, CheckSquare, BookOpen, ChevronDown, Plus, AlertCircle, Loader2 } from 'lucide-react'
import { ChatMessage } from '../../store/dataStore'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useSettingsStore } from '../../store'
 // wait, getTaskAttachments was in syncEngine? No, we didn't export it. We'll just skip attachments for now or write a simple get.

// Actually getTaskAttachments is not exported from syncEngine, let's just omit it and use the local db.
// Wait, I will just build the context from db.

export default function AIScreen() {
  const { t } = useTranslation();
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('default')
  const [showSessionsMenu, setShowSessionsMenu] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash')
  
  const [streamingMessage, setStreamingMessage] = useState('')

  const { geminiApiKey } = useSettingsStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const allMessages = useDataStore(state => state.messages)
  const messages = allMessages.filter(m => m.sessionId === currentSessionId).sort((a, b) => a.timestamp - b.timestamp)
  const sessions = useDataStore(state => state.chatSessions)
  const tasksCount = useDataStore(state => state.tasks.length)
  const driveFilesCount = useDataStore(state => state.driveFiles.length)

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

  const MODELS = [
  { id: 'gemini-3.6-flash', label: 'Flash 3.6', icon: Zap, color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', desc: t('fastDailyTasks') },
  { id: 'gemini-3.1-pro-preview', label: 'Pro 3.1', icon: Brain, color: 'text-accent-blue', bg: 'bg-accent-blue/10', desc: t('complexAnalysis') }
]

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0]

  
  const clearChat = async () => {
    if (window.confirm(t('confirmClearChat'))) {
      useDataStore.getState().messages.filter((m: any) => m.sessionId === currentSessionId).forEach((m: any) => cloudDeleteChatMessage(String(m.id)))
      await cloudDeleteChatSession(String(currentSessionId))
      createNewSession()
    }
  }

  const hasMessages = messages && messages.length > 0

    const sendMessage = async (text: string = input) => {
    if (!text.trim() || loading) return
    if (!geminiApiKey) {
      alert(t('apiKeyMissing') || 'Please add Gemini API Key in Settings first')
      return
    }

    const userMsgText = text.trim()

    if (!hasMessages) {
      const title = userMsgText.length > 25 ? userMsgText.substring(0, 25) + '...' : userMsgText
      await ensureSessionExists(title)
    } else {
      await ensureSessionExists()
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: userMsgText,
      timestamp: Date.now(),
      sessionId: currentSessionId }

    await cloudAddChatMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      let history = [];
        let expectedRole = 'user';
        for (const m of (messages || [])) {
          const role = m.role === 'assistant' ? 'model' : 'user';
          if (role === expectedRole) {
            history.push({ role, parts: [{ text: m.content || ' ' }] });
            expectedRole = role === 'user' ? 'model' : 'user';
          } else {
            if (history.length > 0) {
              history[history.length - 1].parts[0].text += "\n" + (m.content || ' ');
            }
          }
        }
        if (history.length > 0 && history[history.length - 1].role === 'user') {
          history.pop();
        }

      let currentModelId = selectedModel;
      let genAI = new GoogleGenerativeAI(geminiApiKey.trim());
      
      
        const userTasks = useDataStore.getState().tasks.filter((t: any) => !t.completed).map((t: any) => t.title).join(', ');
        const userEvents = useDataStore.getState().events.filter((e: any) => new Date(e.startDate || 0) >= new Date()).map((e: any) => e.title).join(', ');
        const userFiles = useDataStore.getState().driveFiles.map((f: any) => f.name).join(', ');
        const s = useSettingsStore.getState();
        const profileInfo = "Name: " + (s.userName || "Not specified") + ", Major: " + (s.userMajor || "Not specified") + ", Semester: " + (s.currentSemester || "Not specified");
        
        const sysInst = t('aiInstruction') + "\n\nUser Profile:\n" + profileInfo + "\n\nCurrent Pending Tasks:\n" + (userTasks || 'None') + "\n\nUpcoming Events:\n" + (userEvents || 'None') + "\n\nUser Files:\n" + (userFiles || 'None');

        const generateAttempt = async (modelId: string) => {
          const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: sysInst });
          const chat = model.startChat({ history });
          const result = await chat.sendMessageStream(userMsgText);
          
          let generated = '';
          let lastUpdateTime = 0;
          
          for await (const chunk of result.stream) {
            generated += chunk.text();
            
            const now = Date.now();
            if (now - lastUpdateTime > 100) {
              setStreamingMessage(generated);
              lastUpdateTime = now;
            }
          }
          
          if (!generated) {
            generated = "I'm sorry, I couldn't generate a response.";
          }
          
          return generated;
        }
      
      let fullText = '';
      try {
        fullText = await generateAttempt(currentModelId);
      } catch (err: any) {
        if (err.message && (err.message.includes('429') || err.message.includes('Resource has been exhausted'))) {
           console.log("Pro model rate limited. Falling back to Flash...");
           setStreamingMessage('عذراً، مفتاح API الخاص بك لا يدعم نموذج Pro (يتطلب ربط بطاقة في Google AI Studio). جاري استخدام Flash مجاناً...');
           fullText = await generateAttempt('gemini-3.6-flash');
        } else {
           throw err;
        }
      }

      await cloudAddChatMessage({
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        sessionId: currentSessionId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await cloudAddChatMessage({
        role: 'assistant',
        content: 'Error: ' + msg,
        timestamp: Date.now(),
        sessionId: currentSessionId })
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
              <div className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-surface-elevated border border-surface-border rounded-xl shadow-lg shadow-black/20 overflow-hidden origin-top z-50 animate-in fade-in zoom-in-95 duration-200 right-0 sm:right-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id)
                      setShowModelPicker(false)
                    }}
                    className={`w-full flex items-start gap-3 p-3 transition-colors ${
                      selectedModel === m.id ? 'bg-surface-hover' : 'hover:bg-surface-hover/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                      <m.icon size={15} className={m.color} />
                    </div>
                    <div className="text-start flex-1">
                      <p className={`text-sm font-medium ${selectedModel === m.id ? m.color : 'text-text-primary'}`}>
                        {m.label}
                      </p>
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

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" onClick={() => setShowModelPicker(false)}>
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
            >
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${currentModel.bg}`}>
                  <currentModel.icon size={13} className={currentModel.color} />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-xl2 px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-accent-blue text-white rounded-tr-sm'
                    : 'bg-surface-card border border-surface-border text-text-primary rounded-tl-sm'
                  }`}
                >
                  <div dir="rtl" className="prose prose-invert prose-p:text-right prose-headings:text-right prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                  </div>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-text-muted'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
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
            <div className="max-w-[82%] rounded-xl2 px-3.5 py-2.5 bg-surface-card border border-surface-border text-text-primary rounded-tl-sm">
              <div dir="rtl" className="prose prose-invert prose-p:text-right prose-headings:text-right prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{streamingMessage}</ReactMarkdown>
              </div>
              <span className="animate-pulse inline-block w-1 h-3 mt-1 bg-current"></span>
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
      <div className="px-4 py-1.5 border-t border-surface-border/50 flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] text-text-muted">{t('context')}:</span>
        <span className="text-[10px] text-accent-green">{t('upcomingTasks')}</span>
        <span className="text-[10px] text-accent-yellow">{t('eventsAndExams')}</span>
        
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-2 border-t border-surface-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={t('askAi') + '...'}
              className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent-blue/50 transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={loading}
              onClick={() => setShowModelPicker(false)}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              input.trim() && !loading
                ? 'bg-accent-blue text-white hover:bg-blue-500 active:scale-95'
                : 'bg-surface-elevated text-text-muted'
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} className="rtl-flip" />
            )}
          </button>
        </div>
        <div className="text-center mt-1.5 text-[9px] text-text-muted">
          Enter {t('toSendOr')} Shift+Enter {t('forNewLine')}
        </div>
      </div>
    </div>
  )
}
