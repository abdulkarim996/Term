import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import { cloudAddSubject, getUid } from '../../lib/firestore'
import { scheduleNotification, getUtcCron, cancelNotification } from '../../lib/qStashScheduler'
import React, { useState } from 'react';
import { CustomTimePicker } from '../ui/CustomPickers';
import { Plus, X, Clock, MapPin, Trash2 } from 'lucide-react'
import type {  LectureTime  } from '../../store/dataStore'
import { getRandomSubjectColor, SUBJECT_COLORS } from '../../lib/utils'
import { useUIStore } from '../../store'
import { useDataStore } from '../../store/dataStore'
import Modal from '../ui/Modal'

interface Props {
  editSubject?: any
  isOpen: boolean
  onClose: () => void
}

import { useEffect } from 'react';
import { cloudUpdateSubject } from '../../lib/firestore';
export default function AddSubjectModal({ isOpen, onClose, editSubject }: Props) {
  const { t } = useTranslation();
  const { showToast } = useUIStore()
  const [form, setForm] = useState({
    name: '',
    code: '',
    color: getRandomSubjectColor(),
    creditHours: '',
    instructor: '',
    section: '' })
  const [lectures, setLectures] = useState<LectureTime[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editSubject && isOpen) {
      setForm({
        name: editSubject.name || '',
        code: editSubject.code || '',
        color: editSubject.color || getRandomSubjectColor(),
        creditHours: editSubject.creditHours ? String(editSubject.creditHours) : '',
        instructor: editSubject.instructor || '',
        section: editSubject.section || ''
      })
      setLectures(editSubject.lectures || [])
    } else if (isOpen && !editSubject) {
      setForm({ name: '', code: '', color: getRandomSubjectColor(), creditHours: '', instructor: '',
    section: '' })
      setLectures([])
    }
  }, [editSubject, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        color: form.color,
        creditHours: form.creditHours ? Number(form.creditHours) : undefined,
        instructor: form.instructor.trim() || undefined,
        section: form.section?.trim() || undefined,
        lectures: lectures.length > 0 ? lectures : undefined
      };
      
      
        let subjectId = editSubject ? String(editSubject.id) : null;
        
        if (editSubject) {
          await cloudUpdateSubject(subjectId, payload);
          if (editSubject.qStashIds) {
            for (const id of editSubject.qStashIds) {
              await cancelNotification(id, true);
            }
          }
        } else {
          subjectId = await cloudAddSubject({ ...payload, createdAt: Date.now() });
        }

        const newQStashIds = [];
        if (payload.lectures && payload.lectures.length > 0) {
          for (const lec of payload.lectures) {
            if (lec.startTime) {
              const cron = getUtcCron(lec.dayOfWeek, lec.startTime);
              const qId = await scheduleNotification({
                title: 'تذكير بمحاضرة 🔔',
                body: `محاضرة ${form.name} ستبدأ قريباً!`,
                uid: getUid() || '',
                isRecurring: true,
                cron: cron
              });
              if (qId) newQStashIds.push(qId);
            }
          }
          if (newQStashIds.length > 0) {
            await cloudUpdateSubject(subjectId, { qStashIds: newQStashIds });
          }
        }

      showToast(`تم إضافة المادة ${form.name} بنجاح`, 'success')
      setForm({ name: '', code: '', color: getRandomSubjectColor(), creditHours: '', instructor: '',
    section: '' })
      setLectures([])
      onClose()
    } catch {
      showToast(t('addError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const addLecture = () => {
    setLectures([...lectures, { dayOfWeek: 0, startTime: '08:00', endTime: '09:00', location: '' }])
  }

  const updateLecture = (index: number, changes: Partial<LectureTime>) => {
    setLectures(prev => {
      const arr = [...prev]
      arr[index] = { ...arr[index], ...changes }
      return arr
    })
  }

  const removeLecture = (index: number) => {
    setLectures(prev => {
      const arr = [...prev]
      arr.splice(index, 1)
      return arr
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editSubject ? t('editSubject') : t('addSubject')}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-xs text-text-muted mb-1">{t('subjectNameInput')} *</label>
          <input
            className="input-field text-sm"
            placeholder={`${t('example')}: ${t('operationsResearch')}`}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('subjectCodeAndSection')}</label>
              <input
                className="input-field text-sm"
                placeholder={t('subjectCodePlaceholder')}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">{t('creditHours')}</label>
            <input
              type="number"
              className="input-field text-sm"
              placeholder="3"
              min="1"
              max="6"
              value={form.creditHours}
              onChange={(e) => setForm((f) => ({ ...f, creditHours: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">{t('lecturer')}</label>
          <input
            className="input-field text-sm"
            placeholder={`د. ${t('ahmedAbdullah')}`}
            value={form.instructor}
            onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
          />
        </div>


        {/* Color picker */}
        <div>
          <label className="block text-xs text-text-muted mb-2">{t('colorLabel')} ({t('usedToDistinguish')})</label>
          <div className="flex flex-wrap gap-2 items-center">
            {SUBJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color }))}
                className={`w-8 h-8 rounded-xl transition-all ${
                  form.color === color ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-surface-card' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label
              className={`relative w-8 h-8 rounded-xl cursor-pointer transition-all flex items-center justify-center bg-surface-elevated border border-dashed border-text-muted hover:bg-surface-hover ${
                !SUBJECT_COLORS.includes(form.color) ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-surface-card border-none' : ''
              }`}
              style={!SUBJECT_COLORS.includes(form.color) ? { backgroundColor: form.color } : {}}
              title={t('addNewSubject')}
            >
              {!SUBJECT_COLORS.includes(form.color) ? null : <span className="text-[14px] text-text-muted pb-0.5">+</span>}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="absolute opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="pt-2 border-t border-surface-border">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-semibold text-text-primary">{t('lectureTimesTitle')} ({t('optional')})</label>
            <button type="button" onClick={addLecture} className="text-[10px] bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-md hover:bg-accent-blue/20 flex items-center gap-1">
              <Plus size={12} />{t('addLectureBtn')}</button>
          </div>

          <div className="space-y-2">
            {lectures.length === 0 && (
              <p className="text-[10px] text-text-muted text-center py-2 bg-surface rounded-lg">{t('noLecturesAdded')}. {t('useBtnToAddLec')}.</p>
            )}
            {lectures.map((lec, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-2 bg-surface rounded-lg border border-surface-border">
                <div className="flex gap-2">
                  <select 
                    className="input-field text-xs flex-1 !p-1.5"
                    value={lec.dayOfWeek}
                    onChange={e => updateLecture(idx, { dayOfWeek: Number(e.target.value) })}
                  >
                    {[t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')].map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                  <button type="button" onClick={() => removeLecture(idx)} className="p-1.5 text-accent-red hover:bg-accent-red/10 rounded-md">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <Clock size={12} className="text-text-muted" />
                  <CustomTimePicker value={lec.startTime} onChange={(val) => updateLecture(idx, { startTime: val })} />
                  <span className="text-text-muted text-[10px]">-</span>
                  <CustomTimePicker value={lec.endTime} onChange={(val) => updateLecture(idx, { endTime: val })} />
                </div>
                <div className="flex gap-2 items-center">
                  <MapPin size={12} className="text-text-muted" />
                  <input placeholder={`${t('room')} (${t('optional')})`} className="input-field text-xs !p-1 flex-1" value={lec.location || ''} onChange={e => updateLecture(idx, { location: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? t('saving') + '...' : t('addSubjectConfirm')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
