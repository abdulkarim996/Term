// @ts-nocheck
import React from 'react'
import { Home, Calendar, CheckSquare, FolderOpen, Sparkles, MoreHorizontal, BookOpen } from 'lucide-react'
import { useUIStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'



export default function BottomNav() {
  const { activeTab, setActiveTab } = useUIStore()
  const { t } = useTranslation()

  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'calendar', label: t('calendar'), icon: Calendar },
    { id: 'tasks', label: t('tasks'), icon: CheckSquare },
    { id: 'storage', label: t('storage'), icon: FolderOpen },
    { id: 'study', label: t('study'), icon: BookOpen },
    { id: 'ai', label: t('ai'), icon: Sparkles },
    { id: 'more', label: t('more'), icon: MoreHorizontal },
  ] as const


  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 border-t border-surface-border backdrop-blur-xl"
      style={{
        height: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[72px] px-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`nav-item flex-1 ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-all duration-200 ${
                    isActive ? 'text-accent-blue' : 'text-text-muted'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-blue" />
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${
                isActive ? 'text-accent-blue' : 'text-text-muted'
              }`}>
                {t(id)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
