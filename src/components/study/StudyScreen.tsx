// @ts-nocheck
import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useRef, Suspense, lazy } from 'react'
import { BookOpen, PenTool, FolderOpen, Calculator, Columns, Square, Sparkles } from 'lucide-react'
import CalculatorWidget from './CalculatorWidget'
import AIScreen from '../ai/AIScreen'

const WhiteBoard = lazy(() => import('./WhiteBoard'))
const FileViewer = lazy(() => import('./FileViewer'))

type PaneContent = 'whiteboard' | 'files'

export default function StudyScreen() {
  const { t, language } = useTranslation();

  // Single pane state
  const [activeTab, setActiveTab] = useState<PaneContent>('files')
  
  // Split pane states
  const [isSplitScreen, setIsSplitScreen] = useState(false)
  const [leftPaneContent, setLeftPaneContent] = useState<PaneContent>('files')
  const [rightPaneContent, setRightPaneContent] = useState<PaneContent>('whiteboard')
  
  const [showCalculator, setShowCalculator] = useState(false)
  const [showAISidebar, setShowAISidebar] = useState(false)

  // Resizable AI Sidebar state & handlers
  const [aiSidebarWidth, setAiSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_ai_sidebar_width')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 260 && parsed <= 750) return parsed
      }
    } catch {}
    return 360
  })
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(aiSidebarWidth)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = aiSidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      const isRtl = document.documentElement.dir === 'rtl' || language === 'ar'
      const delta = isRtl ? (ev.clientX - startXRef.current) : (startXRef.current - ev.clientX)
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 260), Math.round(window.innerWidth * 0.7))
      setAiSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      setAiSidebarWidth(curr => {
        try { localStorage.setItem('study_ai_sidebar_width', String(curr)) } catch {}
        return curr
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return
    isDraggingRef.current = true
    setIsDragging(true)
    const touchStartX = e.touches[0].clientX
    const initialWidth = aiSidebarWidth

    const handleTouchMove = (ev: TouchEvent) => {
      if (!isDraggingRef.current || !ev.touches[0]) return
      const isRtl = document.documentElement.dir === 'rtl' || language === 'ar'
      const delta = isRtl ? (ev.touches[0].clientX - touchStartX) : (touchStartX - ev.touches[0].clientX)
      const newWidth = Math.min(Math.max(initialWidth + delta, 260), Math.round(window.innerWidth * 0.75))
      setAiSidebarWidth(newWidth)
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      setAiSidebarWidth(curr => {
        try { localStorage.setItem('study_ai_sidebar_width', String(curr)) } catch {}
        return curr
      })
    }

    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
  }

  const renderPane = (content: PaneContent) => {
    return (
      <div className="flex-1 bg-surface rounded-xl overflow-hidden shadow-sm flex flex-col" style={{minHeight:0}}>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>}>
          {content === 'files' ? <FileViewer /> : <WhiteBoard />}
        </Suspense>
      </div>
    )
  }

  const renderSplitPane = (content: PaneContent, setContent: (c: PaneContent) => void) => {
    return (
      <div className="flex-1 flex flex-col relative min-w-0 bg-surface rounded-xl overflow-hidden shadow-sm border border-surface-elevated">
         {/* Top toggle for this specific pane */}
         <div className="flex bg-surface-elevated p-1 z-10">
            <button
              onClick={() => setContent('files')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                content === 'files' ? 'bg-accent-purple text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
            >
              <FolderOpen size={14} />
              <span>{t('files') || 'Files'}</span>
            </button>
            <button
              onClick={() => setContent('whiteboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                content === 'whiteboard' ? 'bg-accent-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
            >
              <PenTool size={14} />
              <span>{t('whiteboard') || 'Whiteboard'}</span>
            </button>
            <button
              onClick={() => setShowAISidebar(!showAISidebar)}
              className={`ml-1 px-2.5 flex items-center justify-center rounded-lg transition-all ${
                showAISidebar ? 'bg-accent-blue/10 text-accent-blue shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
              title="AI Assistant"
            >
              <Sparkles size={14} />
            </button>
         </div>
         {/* Pane Content Container */}
         <div className="flex-1 overflow-hidden flex flex-col" style={{minHeight:0}}>
           <div className="flex-1 w-full relative flex flex-col">
             <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>}>
               {content === 'files' ? <FileViewer /> : <WhiteBoard />}
             </Suspense>
           </div>
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-surface-elevated pt-safe-top pb-4 px-6 rounded-b-[2rem] shadow-sm relative z-10 shrink-0" style={{paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
              <BookOpen className="text-accent-blue" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{t('studyRoom')}</h1>
              <p className="text-sm text-text-muted">{t('focusAndAchieve')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Split Screen Toggle */}
            <button
              onClick={() => setIsSplitScreen(!isSplitScreen)}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shadow-sm ${
                isSplitScreen ? 'bg-accent-blue text-white' : 'bg-surface border border-border text-text-muted hover:text-text-primary'
              }`}
              title={isSplitScreen ? "Single View" : "Split Screen View"}
            >
              {isSplitScreen ? <Square size={20} /> : <Columns size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Single View Tabs & Calculator (Only show if not split) */}
      {!isSplitScreen && (
        <div className="px-4 mt-4 mb-0 flex gap-2 shrink-0">
          <div className="flex bg-surface-elevated rounded-xl p-1 shadow-sm flex-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'files' ? 'bg-accent-purple text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
            >
              <FolderOpen size={16} />
              <span className="hidden sm:inline">{t('files')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'whiteboard' ? 'bg-accent-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
            >
              <PenTool size={16} />
              <span className="hidden sm:inline">{t('whiteboard')}</span>
            </button>
          </div>

          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`px-4 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all shadow-sm ${
              showCalculator ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <Calculator size={18} />
          </button>

          {/* AI Assistant Button with Size Presets */}
          <div className="flex items-center bg-surface-elevated rounded-xl p-0.5 shadow-sm border border-surface-border">
            <button
              onClick={() => setShowAISidebar(!showAISidebar)}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                showAISidebar ? 'bg-accent-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
              title="AI Assistant"
            >
              <Sparkles size={16} />
              <span className="text-xs font-medium hidden sm:inline">{language === 'ar' ? 'المساعد' : 'AI'}</span>
            </button>

            {showAISidebar && (
              <div className="flex items-center gap-1 px-1.5 border-l border-surface-border ltr:border-l rtl:border-r">
                <button
                  onClick={() => { setAiSidebarWidth(280); try { localStorage.setItem('study_ai_sidebar_width', '280'); } catch {} }}
                  className={`text-[11px] px-2 py-1 rounded-md transition-all font-medium ${
                    Math.abs(aiSidebarWidth - 280) < 30 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض مدمج (280px)' : 'Compact width (280px)'}
                >
                  {language === 'ar' ? 'صغير' : 'S'}
                </button>
                <button
                  onClick={() => { setAiSidebarWidth(360); try { localStorage.setItem('study_ai_sidebar_width', '360'); } catch {} }}
                  className={`text-[11px] px-2 py-1 rounded-md transition-all font-medium ${
                    Math.abs(aiSidebarWidth - 360) < 30 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض قياسي (360px)' : 'Standard width (360px)'}
                >
                  {language === 'ar' ? 'متوسط' : 'M'}
                </button>
                <button
                  onClick={() => { setAiSidebarWidth(520); try { localStorage.setItem('study_ai_sidebar_width', '520'); } catch {} }}
                  className={`text-[11px] px-2 py-1 rounded-md transition-all font-medium ${
                    aiSidebarWidth >= 480 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض عريض (520px)' : 'Wide width (520px)'}
                >
                  {language === 'ar' ? 'عريض' : 'L'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Split View Header Controls */}
      {isSplitScreen && (
        <div className="px-4 mt-4 mb-0 flex justify-end gap-2 shrink-0">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`px-4 flex items-center justify-center gap-2 py-2 rounded-xl transition-all shadow-sm text-sm font-medium ${
              showCalculator ? 'bg-accent-blue text-white' : 'bg-surface-elevated border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            <Calculator size={16} />
            <span>Calculator</span>
          </button>

          {/* AI Assistant Button with Size Presets for Split View */}
          <div className="flex items-center bg-surface-elevated rounded-xl p-0.5 shadow-sm border border-surface-border">
            <button
              onClick={() => setShowAISidebar(!showAISidebar)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium ${
                showAISidebar ? 'bg-accent-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
              title="AI Assistant"
            >
              <Sparkles size={16} />
              <span className="text-xs font-medium hidden sm:inline">{language === 'ar' ? 'المساعد' : 'AI'}</span>
            </button>

            {showAISidebar && (
              <div className="flex items-center gap-1 px-1.5 border-l border-surface-border ltr:border-l rtl:border-r">
                <button
                  onClick={() => { setAiSidebarWidth(280); try { localStorage.setItem('study_ai_sidebar_width', '280'); } catch {} }}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium ${
                    Math.abs(aiSidebarWidth - 280) < 30 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض مدمج (280px)' : 'Compact width (280px)'}
                >
                  {language === 'ar' ? 'صغير' : 'S'}
                </button>
                <button
                  onClick={() => { setAiSidebarWidth(360); try { localStorage.setItem('study_ai_sidebar_width', '360'); } catch {} }}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium ${
                    Math.abs(aiSidebarWidth - 360) < 30 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض قياسي (360px)' : 'Standard width (360px)'}
                >
                  {language === 'ar' ? 'متوسط' : 'M'}
                </button>
                <button
                  onClick={() => { setAiSidebarWidth(520); try { localStorage.setItem('study_ai_sidebar_width', '520'); } catch {} }}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium ${
                    aiSidebarWidth >= 480 ? 'bg-accent-blue/15 text-accent-blue font-bold' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                  title={language === 'ar' ? 'عرض عريض (520px)' : 'Wide width (520px)'}
                >
                  {language === 'ar' ? 'عريض' : 'L'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-row px-4 pt-4 pb-4 gap-4 overflow-hidden" style={{minHeight: 0}}>
        
        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{minHeight:0}}>
          {isSplitScreen ? (
            <div className="flex-1 flex flex-col md:flex-row gap-4 w-full relative min-h-0">
              {renderSplitPane(leftPaneContent, setLeftPaneContent)}
              {renderSplitPane(rightPaneContent, setRightPaneContent)}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden" style={{minHeight:0}}>
              {renderPane(activeTab)}
            </div>
          )}
        </div>

        {/* Resizer Divider Handle */}
        {showAISidebar && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="w-3 -mx-2 hover:w-4 flex items-center justify-center cursor-col-resize z-30 group select-none shrink-0"
            title={language === 'ar' ? 'اسحب لتكبير أو تصغير الشات' : 'Drag to resize AI chat'}
          >
            <div className={`w-1 h-16 rounded-full transition-all ${isDragging ? 'bg-accent-blue scale-y-125 w-1.5' : 'bg-surface-border group-hover:bg-accent-blue group-hover:scale-y-110'}`} />
          </div>
        )}

        {/* AI Sidebar - Always mounted, hidden via CSS width to prevent workspace collapse */}
        <div
          style={{
            width: showAISidebar ? `${aiSidebarWidth}px` : '0px',
            transition: isDragging ? 'none' : 'width 0.3s ease',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ width: `${aiSidebarWidth}px`, height: '100%', display: 'flex', flexDirection: 'column' }}
               className="bg-surface-elevated rounded-2xl shadow-sm border border-surface-border overflow-hidden">
            <AIScreen />
          </div>
        </div>

      </div>

      {showCalculator && (
        <CalculatorWidget onClose={() => setShowCalculator(false)} />
      )}
    </div>
  )
}
