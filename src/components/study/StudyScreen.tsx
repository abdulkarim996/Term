// @ts-nocheck
import { useTranslation } from '../../hooks/useTranslation'
import React, { useState } from 'react'
import { BookOpen, PenTool, FolderOpen, Calculator, Columns, Square } from 'lucide-react'
import WhiteBoard from './WhiteBoard'
import FileViewer from './FileViewer'
import CalculatorWidget from './CalculatorWidget'

type PaneContent = 'whiteboard' | 'files'

export default function StudyScreen() {
  const { t } = useTranslation();

  // Single pane state
  const [activeTab, setActiveTab] = useState<PaneContent>('files')
  
  // Split pane states
  const [isSplitScreen, setIsSplitScreen] = useState(false)
  const [leftPaneContent, setLeftPaneContent] = useState<PaneContent>('files')
  const [rightPaneContent, setRightPaneContent] = useState<PaneContent>('whiteboard')
  
  const [showCalculator, setShowCalculator] = useState(false)

  const renderPane = (content: PaneContent) => {
    return (
      <div className="absolute inset-0 w-full h-full bg-surface rounded-xl overflow-hidden shadow-sm">
        {content === 'files' ? <FileViewer /> : <WhiteBoard />}
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
         </div>
         {/* Pane Content Container */}
         <div className="flex-1 relative w-full h-full">
           <div className="absolute inset-0 w-full h-full">
             {content === 'files' ? <FileViewer /> : <WhiteBoard />}
           </div>
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-surface-elevated pt-12 pb-4 px-6 rounded-b-[2rem] shadow-sm mb-4 relative z-10">
        <div className="flex items-center justify-between mb-2">
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
        <div className="px-4 mb-4 flex gap-2">
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
        </div>
      )}

      {/* Calculator Toggle for Split View */}
      {isSplitScreen && (
        <div className="px-4 mb-3 flex justify-end">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`px-4 flex items-center justify-center gap-2 py-2 rounded-xl transition-all shadow-sm text-sm font-medium ${
              showCalculator ? 'bg-accent-blue text-white' : 'bg-surface-elevated border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            <Calculator size={16} />
            <span>Calculator</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        {isSplitScreen ? (
          <div className="flex-1 flex flex-col md:flex-row gap-4 w-full h-full relative">
            {renderSplitPane(leftPaneContent, setLeftPaneContent)}
            {renderSplitPane(rightPaneContent, setRightPaneContent)}
          </div>
        ) : (
          <div className="flex-1 relative w-full h-full">
            {renderPane(activeTab)}
          </div>
        )}
      </div>

      {showCalculator && (
        <CalculatorWidget onClose={() => setShowCalculator(false)} />
      )}
    </div>
  )
}
