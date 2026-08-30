import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudAddEvent } from '../../lib/firestore'
import React, { useState } from 'react';
import { CustomDateTimePicker } from '../ui/CustomPickers';
import type {  CalendarEvent  } from '../../store/dataStore'
import { generateStudyBlocksForExam } from '../../lib/utils'
import { useUIStore, useSettingsStore } from '../../store'
import Modal from '../ui/Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultDate?: number
}

export default function AddEventModal({ isOpen, onClose, defaultDate }: Props) {
  const { t } = useTranslation();
  const { showToast, selectedDate } = useUIStore()
  const { autoStudyBlocks } = useSettingsStore()
  const subjects = useDataStore(state => state.subjects)

  const [form, setForm] = useState({
    title: '',
    type: 'lecture' as CalendarEvent['type'],
    subjectId: '',
    startDate: defaultDate
      ? new Date(defaultDate).toISOString().slice(0, 16)
      : new Date(selectedDate).toISOString().slice(0, 16),
    endDate: '',
    location: '',
    description: '',
    isRecurring: false,
    recurringDays: [] as number[],
    recurringUntil: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.startDate) return
    setSaving(true)

    try {
      const startTs = new Date(form.startDate).getTime()
      const endTs = form.endDate
        ? new Date(form.endDate).getTime()
        : startTs + 3600000

      const event: CalendarEvent = {
        title: form.title.trim(),
        type: form.type,
        subjectId: form.subjectId || undefined,
        startDate: startTs,
        endDate: endTs,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        isRecurring: form.isRecurring,
        recurringDays: form.isRecurring ? form.recurringDays : undefined,
        recurringUntil: form.recurringUntil ? new Date(form.recurringUntil).getTime() : undefined,
        createdAt: Date.now() }

      const id = await cloudAddEvent(event)
      const savedEvent = { ...event, id }

      // Auto-generate study blocks for exams only if setting is enabled
      if (form.type === 'exam' && autoStudyBlocks) {
        await generateStudyBlocksForExam(savedEvent)
        showToast('تم إضافة الاختبار وجلسات الدراسة التلقائية بنجاح ✨', 'success')
      } else if (form.type === 'exam') {
        showToast(t('examAdded'), 'success')
      } else {
        showToast(t('eventAdded'), 'success')
      }

      setForm({
        title: '',
        type: 'lecture',
        subjectId: '',
        startDate: new Date(selectedDate).toISOString().slice(0, 16),
        endDate: '',
        location: '',
        description: '',
        isRecurring: false,
        recurringDays: [],
        recurringUntil: '' })
      onClose()
    } catch {
      showToast(t('addError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleRecurringDay = (day: number) => {
  const { t } = useTranslation();
    setForm((f) => ({
      ...f,
      recurringDays: f.recurringDays.includes(day)
        ? f.recurringDays.filter((d) => d !== day)
        : [...f.recurringDays, day] }))
  }

  const DAYS_AR = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('addNewEvent')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('eventTitle')} *</label>
          <input
            className="input-field text-sm"
            placeholder={`${t('example')}: ${t('operationsLecture')}`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('subject')}</label>
          <select
            className="select-field text-sm w-full"
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
          >
            <option value="">+ {t('noSubject')} +</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Exam notice */}
        {form.type === 'exam' && (
          <div className={`rounded-xl p-3 text-xs border ${
            autoStudyBlocks
              ? 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple'
              : 'bg-surface-elevated border-surface-border text-text-muted'
          }`}>
            {autoStudyBlocks ? '✨ ' + t('autoStudyNotice') : '⚠️ ' + t('autoStudyDisabledNotice') + ' (' + t('enableInSettings') + ')'}
          </div>
        )}

        {/* Start/End */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('start')} *</label>
            <CustomDateTimePicker value={form.startDate} onChange={(val) => setForm(f => ({ ...f, startDate: val }))} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('end')}</label>
            <CustomDateTimePicker value={form.endDate} onChange={(val) => setForm(f => ({ ...f, endDate: val }))} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('location')} / {t('room')}</label>
          <input
            className="input-field text-sm"
            placeholder={`${t('example')}: ${t('roomLabel')} A-201`}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>

        {/* Recurring */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-text-secondary">{t('repeatsWeekly')}</span>
          </label>
        </div>

        {form.isRecurring && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {DAYS_AR.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleRecurringDay(i)}
                  className={`chip ${form.recurringDays.includes(i) ? 'active' : ''}`}
                >
                  {day}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('repeatsUntil')}</label>
              <input
                type="date"
                className="w-full bg-[#1e1e1e] text-white border border-gray-700 rounded-md p-2 focus:ring-1 focus:ring-blue-500 [color-scheme:dark] outline-none"
                value={form.recurringUntil}
                onChange={(e) => setForm((f) => ({ ...f, recurringUntil: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('notes')}</label>
          <textarea
            className="input-field text-sm resize-none"
            rows={2}
            placeholder={t('addExtraNotes') + '...'}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center"
          >{t('cancel')}</button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? t('saving') + '...' : t('addEventBtn')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
