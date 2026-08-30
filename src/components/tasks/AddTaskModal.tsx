import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudAddTask, cloudUpdateTask } from '../../lib/firestore'
import React, { useState, useEffect } from 'react';
import { CustomDateTimePicker } from '../ui/CustomPickers';
import type { Task } from '../../store/dataStore'
import { useUIStore } from '../../store'
import Modal from '../ui/Modal'
import { Paperclip, X } from 'lucide-react'

interface Props {
  editTask?: any
  isOpen?: boolean
  onClose?: () => void
}

export default function AddTaskModal({ isOpen: propIsOpen, onClose: propOnClose, editTask }: Props) {
  const { t } = useTranslation();
  const { showAddTask, setShowAddTask, showToast, selectedDate } = useUIStore()
  const isOpen = propIsOpen ?? showAddTask
  const onClose = propOnClose ?? (() => setShowAddTask(false))

  const subjects = useDataStore(state => state.subjects)

  const [form, setForm] = useState({
    title: '',
    description: '',
    subjectId: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    attachments: [] as any[] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editTask && propIsOpen) {
      setForm({
        title: editTask.title || '',
        description: editTask.description || '',
        subjectId: editTask.subjectId ? String(editTask.subjectId) : '',
        priority: editTask.priority || 'medium',
        dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().slice(0, 16) : '',
        attachments: editTask.attachments || []
      })
    } else if (propIsOpen && !editTask) {
      setForm({
        title: '',
        description: '',
        subjectId: '',
        priority: 'medium',
        dueDate: '',
        attachments: []
      })
    }
  }, [editTask, propIsOpen])

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newanys: any[] = []

    for (const file of files) {
      // Store small files as base64, large ones just metadata
      if (file.size < 5 * 1024 * 1024) {
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        newanys.push({ name: file.name, type: file.type, size: file.size, data })
      } else {
        newanys.push({ name: file.name, type: file.type, size: file.size })
      }
    }

    setForm((f) => ({ ...f, attachments: [...f.attachments, ...newanys] }))
    e.target.value = ''
  }

  const removeany = (idx: number) => {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    try {
      const task: Task = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        subjectId: form.subjectId || undefined,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
        completed: false,
        attachments: form.attachments.length > 0 ? form.attachments : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now() }

      if (editTask) {
        await cloudUpdateTask(String(editTask.id), task)
      } else {
        await cloudAddTask(task)
      }
      showToast(t('taskAdded'), 'success')

      setForm({
        title: '',
        description: '',
        subjectId: '',
        priority: 'medium',
        dueDate: '',
        attachments: [] })
      onClose()
    } catch {
      showToast(t('addError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const PRIORITY_OPTIONS = [
    { value: 'high', label: '🔥 ' + t('highPriority2'), color: '#f2564a' },
    { value: 'medium', label: '⚡ ' + t('medPriority2'), color: '#f5c842' },
    { value: 'low', label: '🌱 ' + t('lowPriority2'), color: '#52d98b' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTask ? t('editTask') : t('addNewTask')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('taskTitle')} *</label>
          <input
            className="input-field text-sm [color-scheme:dark]"
            placeholder={`${t('example')}: ${t('mathHomeworkExample')}`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            required
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('priorityLevel')}</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority: value as Task['priority'] }))}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                  form.priority === value
                    ? 'text-white'
                    : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text-primary'
                }`}
                style={form.priority === value ? { backgroundColor: color, borderColor: color } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject + Due Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('subject')}</label>
            <select
              className="select-field text-sm"
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">+ {t('none')} +</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('dueDate')}</label>
            <CustomDateTimePicker value={form.dueDate} onChange={(val) => setForm(f => ({ ...f, dueDate: val }))} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('description')}</label>
          <textarea
            className="input-field text-sm resize-none"
            rows={2}
            placeholder={`${t('extraDetails')}...`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* anys */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text-muted">{t('attachments')}</label>
            <label className="flex items-center gap-1 text-xs text-accent-blue cursor-pointer hover:text-blue-400">
              <Paperclip size={12} />
              <span>{t('attachFile')}</span>
              <input type="file" multiple onChange={handleAttach} className="hidden" />
            </label>
          </div>
          {form.attachments.length > 0 && (
            <div className="space-y-1">
              {form.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-1.5">
                  <Paperclip size={11} className="text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-secondary flex-1 truncate">{att.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {(att.size / 1024).toFixed(0)}KB
                  </span>
                  <button type="button" onClick={() => removeany(i)} className="text-text-muted hover:text-accent-red">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? t('saving') : (editTask ? t('saveChanges') : t('addTaskBtn2'))}
          </button>
        </div>
      </form>
    </Modal>
  )
}
