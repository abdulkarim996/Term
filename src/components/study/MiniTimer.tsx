import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import React, { useState } from 'react'
import { Play, Pause, RotateCcw, Edit2, Check } from 'lucide-react'
import { useTimerStore, TimerMode } from '../../store/timerStore'

export default function MiniTimer() {
  const { t } = useTranslation();
  const { timeLeft, isActive, mode, customMins, setIsActive, setMode, setCustomMins, resetTimer } = useTimerStore()
  const [isEditing, setIsEditing] = useState(false)
  const [tempMins, setTempMins] = useState(customMins.toString())

  const toggleTimer = () => setIsActive(!isActive)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as TimerMode
    if (newMode === 'custom') {
       setIsEditing(true)
    } else {
       setIsEditing(false)
    }
    setMode(newMode)
    setTimeout(resetTimer, 0)
  }

  const handleSaveCustom = () => {
    const m = parseInt(tempMins)
    if (!isNaN(m) && m > 0) {
      setCustomMins(m)
      setTimeout(resetTimer, 0)
    }
    setIsEditing(false)
  }

  return (
    <div className="flex items-center gap-2 bg-surface p-1 px-2 rounded-xl border border-surface-border shrink-0">
      <select
        value={mode}
        onChange={handleModeChange}
        className="bg-transparent text-xs font-medium text-text-secondary outline-none cursor-pointer"
        dir="rtl"
      >
        <option value="pomodoro">{t('focus')} (25د)</option>
        <option value="shortBreak">{t('break')} (5د)</option>
        <option value="longBreak">{t('break')} طويلة (15د)</option>
        <option value="custom">{t('custom')}</option>
      </select>
      
      <div className="w-px h-4 bg-surface-border mx-1" />

      {isEditing && mode === 'custom' ? (
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            value={tempMins} 
            onChange={(e) => setTempMins(e.target.value)}
            className="w-12 h-6 text-center text-sm font-bold text-accent-blue bg-background border border-surface-border rounded outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCustom()}
          />
          <button onClick={handleSaveCustom} className="p-1 hover:bg-surface-hover text-accent-green rounded">
             <Check size={14} />
          </button>
        </div>
      ) : (
        <span 
          className={`font-mono text-sm font-bold text-accent-blue min-w-[3.5rem] text-center ${mode === 'custom' ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={() => {
             if (mode === 'custom') setIsEditing(true)
          }}
          title={mode === 'custom' ? t('editCustomTime') : ''}
        >
          {formatTime(timeLeft)}
        </span>
      )}

      <div className="flex items-center gap-1">
        {mode === 'custom' && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
            title={t('editCustomTime')}
          >
            <Edit2 size={12} />
          </button>
        )}
        <button
          onClick={toggleTimer}
          className={`p-1.5 rounded-lg ${isActive ? 'bg-accent-blue text-white' : 'hover:bg-surface-hover text-text-muted'}`}
        >
          {isActive ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          title={t('editCustomTime')}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}
