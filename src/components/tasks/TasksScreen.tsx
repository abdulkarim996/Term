// @ts-nocheck
import React, { useState } from 'react'
import { ArrowUpDown, Plus, Check, Trash2, Edit, Paperclip, Filter, ChevronDown, Lock, Calendar, Flag, BookOpen } from 'lucide-react'
import { useUIStore, useSettingsStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import { useDataStore, Task } from '../../store/dataStore'
import Modal from '../ui/Modal'
import AddTaskModal from './AddTaskModal'
import AddSubjectModal from './AddSubjectModal'
import { cloudDeleteTask, cloudUpdateTask, cloudUpdateSubject, cloudDeleteSubject } from '../../lib/firestore'

export default function TasksScreen() {
  const { t } = useTranslation();
  const { showAddTask, setShowAddTask, showAddSubject, setShowAddSubject, showToast, currentUser } = useUIStore()
  const { dir, language, userName } = useSettingsStore()
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate')
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'study'>('pending')
  const [showSubjectFilter, setShowSubjectFilter] = useState<number | string | null>(null)
  const [expandedTask, setExpandedTask] = useState<number | string | null>(null)
  const [editingTask, setEditingTask] = useState<any>(null)

  const subjects = useDataStore(state => state.subjects)
  const subjectMap = Object.fromEntries((subjects ?? []).map((s: any) => [s.id, s]))

  const allTasks = useDataStore(state => state.tasks)
  const tasks = (() => {
    let filtered = allTasks
    if (filter === 'pending') filtered = allTasks.filter((t: any) => !t.completed)
    else if (filter === 'completed') filtered = allTasks.filter((t: any) => t.completed)
    else if (filter === 'study') filtered = allTasks.filter((t: any) => t.isStudyBlock)

    if (showSubjectFilter !== null) {
      filtered = filtered.filter((t: any) => String(t.subjectId) === String(showSubjectFilter))
    }

    return filtered.sort((a: any, b: any) => {
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? Number(a.dueDate) : Infinity;
        const dateB = b.dueDate ? Number(b.dueDate) : Infinity;
        return dateA - dateB;
      } else {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      }
    })
  })()

  const handleToggleTask = async (task: Task) => {
    try {
      if (!currentUser?.uid) return;
      await cloudUpdateTask(String(String(task.id)), { completed: !task.completed })
    } catch (e) {
      console.error(e)
      showToast(t('updateError'), 'error')
    }
  }

  const handleDeleteTask = async (id: number | string) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        if (!currentUser?.uid) return;
        await cloudDeleteTask(String(String(id)))
        showToast(t('deleted') || 'Deleted', 'success')
      } catch (e) {
        showToast(t('deleteError'), 'error')
      }
    }
  }

  const handleDeleteSubject = async (id: number | string) => {
    if (window.confirm(t('confirmDeleteSubject'))) {
      try {
        if (!currentUser?.uid) return;
        // First delete associated tasks
        const associatedTasks = allTasks.filter(t => String(t.subjectId) === String(id));
        for(let t of associatedTasks) {
           await cloudDeleteTask(String(String(t.id)));
        }
        await cloudDeleteSubject(String(String(id)))
        showToast(t('subjectDeleted'), 'success')
        if (showSubjectFilter === id) setShowSubjectFilter(null)
      } catch (e) {
        showToast(t('deleteError'), 'error')
      }
    }
  }

  const priorities = {
    high: { label: t('urgent'), color: 'text-red-500', bg: 'bg-red-500/10' },
    medium: { label: t('medium'), color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    low: { label: t('low'), color: 'text-green-500', bg: 'bg-green-500/10' }
  }

  return (
    <div className="p-4 space-y-6 animate-fade-in pb-24">
      {/* Header section... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('tasks')}</h1>
          <p className="text-sm text-text-muted mt-1">{tasks.length} {t('tasks')} {filter === 'pending' ? t('waiting') : ''}</p>
        </div>
        <div className="flex gap-2">
          
          <button onClick={() => setShowAddTask(true)} className="p-2 bg-accent-blue text-white rounded-xl shadow-lg shadow-accent-blue/30 transition-transform active:scale-95">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      
      <div className="flex justify-between items-center pb-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-2">
          {(['all', 'pending', 'completed', 'study'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' 
                  : 'bg-surface-hover text-text-muted hover:text-text-primary'
              }`}
            >
              {f === 'all' && t('all')}
              {f === 'pending' && t('inProgress')}
              {f === 'completed' && t('completed')}
              {f === 'study' && t('studySession')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover text-text-muted hover:text-text-primary rounded-xl text-sm font-medium transition-colors border border-border shrink-0"
        >
          <ArrowUpDown size={14} />
          {sortBy === 'dueDate' ? t('dueDate') : t('priority')}
        </button>
      </div>

      {/* Subject Filter */}
      {subjects && subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSubjectFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showSubjectFilter === null ? 'bg-text-primary text-surface' : 'bg-surface-hover text-text-muted'
            }`}
          >{t('allSubjects')}</button>
          {subjects.map((subject: any) => (
            <button
              key={subject.id}
              onClick={() => setShowSubjectFilter(showSubjectFilter === subject.id ? null : subject.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all`}
              style={{
                backgroundColor: showSubjectFilter === subject.id ? subject.color : `${subject.color}15`,
                color: showSubjectFilter === subject.id ? '#fff' : subject.color,
                border: `1px solid ${subject.color}30`
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: showSubjectFilter === subject.id ? '#fff' : subject.color }} />
              {subject.name}
            </button>
          ))}
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-surface-hover rounded-2xl border border-border">
            <Check size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-1">{t('noTasks')}</h3>
            <p className="text-sm text-text-muted">{t('allClearEnjoy')} 🎉</p>
          </div>
        ) : (
          tasks.map((task: any) => {
            const subject = task.subjectId ? subjectMap[task.subjectId] : null
            const isExpanded = expandedTask === task.id
            const priorityInfo = priorities[task.priority as keyof typeof priorities] || priorities.medium

            return (
              <div 
                key={task.id} 
                className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 ${
                  task.completed ? 'opacity-75' : 'shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                }`}
                style={{
                  borderColor: task.completed ? '#22c55e4d' : (subject ? subject.color : undefined),
                  borderLeftWidth: subject && !task.completed ? '4px' : '1px'
                }}
              >
                <div className="p-4 flex items-start gap-4">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                      task.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-text-muted hover:border-accent-blue'
                    }`}
                  >
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0" onClick={() => setExpandedTask(isExpanded ? null : (task.id as number))}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium text-base truncate transition-all ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {task.title}
                      </h3>
                      {task.isStudyBlock && (
                        <span className="bg-accent-purple/10 text-accent-purple text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock size={10} />{t('studyTasks')}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      {subject && (
                        <div className="flex items-center gap-1.5 font-medium" style={{ color: subject.color }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                          {subject.name}
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span className={task.dueDate < Date.now() && !task.completed ? 'text-red-500 font-medium' : ''}>
                            {new Date(task.dueDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-center gap-1 ${priorityInfo.color}`}>
                        <Flag size={12} />
                        {priorityInfo.label}
                      </div>

                      {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-accent-blue">
                          <Paperclip size={12} />
                          {task.attachments.length}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedTask(isExpanded ? null : (task.id as number))}
                    className="p-2 -mr-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-surface-hover/30 text-sm">
                    {task.description && (
                      <p className="text-text-secondary leading-relaxed mb-4 whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setExpandedTask(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-text-primary hover:bg-surface-hover rounded-lg transition-colors text-xs font-medium"
                      >
                        <Edit size={14} />
                        {t('edit')}
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id as number)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-medium"
                      >
                        <Trash2 size={14} />
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <AddTaskModal isOpen={showAddTask || !!editingTask} onClose={() => { setShowAddTask(false); setEditingTask(null); }} editTask={editingTask} />
      
    </div>
  )
}
