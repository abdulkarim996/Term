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
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-2xl shadow-xl"
      style={{
        height: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[72px] px-1 max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`nav-item flex-1 ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={20}
                  className={`transition-all duration-200 ${
                    isActive ? 'text-accent-blue scale-110' : 'text-text-muted hover:text-text-primary'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </div>
              <span className={`text-[10px] font-medium leading-none transition-colors duration-150 ${
                isActive ? 'text-accent-blue font-semibold' : 'text-text-muted'
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
