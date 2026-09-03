// @ts-nocheck
import { useTranslation } from '../../hooks/useTranslation'
import React, { useState } from 'react'
import { BookOpen, PenTool, FolderOpen, Calculator } from 'lucide-react'
import WhiteBoard from './WhiteBoard'
import FileViewer from './FileViewer'
import CalculatorWidget from './CalculatorWidget'

type StudyTab = 'whiteboard' | 'files'

export default function StudyScreen() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<StudyTab>('files')
  const [showCalculator, setShowCalculator] = useState(false)

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-surface-elevated pt-12 pb-4 px-6 rounded-b-[2rem] shadow-sm mb-4 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
            <BookOpen className="text-accent-blue" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('studyRoom')}</h1>
            <p className="text-sm text-text-muted">{t('focusAndAchieve')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Content Area */}
      <div className="flex-1 flex flex-col px-4 pb-4">
        <div className="flex-1 relative w-full">
          {activeTab === 'files' && (
            <div className="absolute inset-0 w-full h-full">
              <FileViewer />
            </div>
          )}
          {activeTab === 'whiteboard' && (
            <div className="absolute inset-0 w-full h-full">
              <WhiteBoard />
            </div>
          )}
        </div>
      </div>

      {showCalculator && (
        <CalculatorWidget onClose={() => setShowCalculator(false)} />
      )}
    </div>
  )
}
