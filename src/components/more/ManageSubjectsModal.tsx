// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudUpdateSubject, cloudUpdateTask, cloudUpdateEvent, cloudUpdateDriveFile, cloudDeleteSubject, getUid } from '../../lib/firestore'
import { scheduleNotification, getUtcCron, cancelNotification } from '../../lib/qStashScheduler'
import React, { useState } from 'react';
import { CustomTimePicker } from '../ui/CustomPickers';
import { Trash2, AlertCircle, Edit2, Plus, X, Clock, MapPin } from 'lucide-react'
import type {  Subject, LectureTime  } from '../../store/dataStore'
import Modal from '../ui/Modal'
import { useUIStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import AddSubjectModal from '../tasks/AddSubjectModal'
import { SUBJECT_COLORS, DAYS_AR } from '../../lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ManageSubjectsModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const subjects = useDataStore(state => state.subjects)
  const { showToast } = useUIStore()
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Subject>>({})

  const startEdit = (sub: Subject) => {
    setEditingId(sub.id!)
    setEditForm({ ...sub, lectures: sub.lectures || [] })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId || !editForm.name) return
    try {
      
        const subject = subjects.find(s => s.id === editingId);
        if (subject && subject.qStashIds) {
          for (const id of subject.qStashIds) {
            await cancelNotification(id, true);
          }
        }

        const newQStashIds = [];
        if (editForm.lectures && editForm.lectures.length > 0) {
          for (const lec of editForm.lectures) {
            if (lec.startTime) {
              const cron = getUtcCron(lec.dayOfWeek, lec.startTime);
              const qId = await scheduleNotification({
                title: '\u062A\u0630\u0643\u064A\u0631 \u0628\u0645\u062D\u0627\u0636\u0631\u0629 \uD83D\uDD14',
                  body: `\u0645\u062D\u0627\u0636\u0631\u0629 ${editForm.name} \u0633\u062A\u0628\u062F\u0623 \u0642\u0631\u064A\u0628\u0627\u064B!`,
                uid: getUid() || '',
                isRecurring: true,
                cron: cron
              });
              if (qId) newQStashIds.push(qId);
            }
          }
        }

        await cloudUpdateSubject(String(editingId), {
          name: editForm.name,
          color: editForm.color,
          code: editForm.code,
          lectures: editForm.lectures,
          qStashIds: newQStashIds
        })
      showToast(t('editsSaved'), 'success')
      setEditingId(null)
    } catch {
      showToast(t('saveError'), 'error')
    }
  }

  const deleteSubject = async (id: number, name: string) => {
    if (!window.confirm(`{t('areYouSure2')} {t("from")} {t('deleteSubject')} "${name}"؟ ({t('deleteSubjectWarning')})`)) {
      return
    }
    try {
      // 1. Unlink Tasks
      const relatedTasks = useDataStore.getState().tasks.filter((t: any) => t.subjectId === id)
      for (const t of relatedTasks) {
        await cloudUpdateTask(String(t.id!), { subjectId: undefined })
      }
      
      // 2. Unlink Events
      const relatedEvents = useDataStore.getState().events.filter((t: any) => t.subjectId === id)
      for (const e of relatedEvents) {
        await cloudUpdateEvent(String(e.id!), { subjectId: undefined })
      }

      // 3. Unlink Files
      const relatedFiles = useDataStore.getState().driveFiles.filter((t: any) => t.subjectId === id)
      for (const f of relatedFiles) {
        await cloudUpdateDriveFile(String(f.id!), { subjectId: undefined, category: undefined })
      }

      // 4. Delete Subject
      
      const subToDelete = subjects.find(s => s.id === id);
        if (subToDelete && subToDelete.qStashIds) {
          for (const qid of subToDelete.qStashIds) {
            await cancelNotification(qid, true);
          }
        }
      await cloudDeleteSubject(String(id))
      showToast(`تم {t('deleteSubject')} "${name}"`, 'info')
    } catch (err) {
      showToast(t('saveError'), 'error')
    }
  }

  const addLecture = () => {
    const newLec: LectureTime = { dayOfWeek: 0, startTime: '08:00', endTime: '09:00', location: '' }
    setEditForm(prev => ({ ...prev, lectures: [...(prev.lectures || []), newLec] }))
  }

  const updateLecture = (index: number, changes: Partial<LectureTime>) => {
    setEditForm(prev => {
      const arr = [...(prev.lectures || [])]
      arr[index] = { ...arr[index], ...changes }
      return { ...prev, lectures: arr }
    })
  }

  const removeLecture = (index: number) => {
    setEditForm(prev => {
      const arr = [...(prev.lectures || [])]
      arr.splice(index, 1)
      return { ...prev, lectures: arr }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("subjects")}>
      <div className="space-y-4">
        {!subjects || subjects.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-sm">
            {t('noSubjectsAdded')}.
          </div>
        ) : (
          subjects.map((sub) => {
            if (editingId === sub.id) {
              return (
                <div key={sub.id} className="p-4 rounded-xl bg-surface-elevated border-2 border-accent-blue/30 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-text-primary text-sm">{t("edit")}</h4>
                    <button onClick={cancelEdit} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-text-muted mb-1">{t("subjectName")} *</label>
                    <input 
                      className="input-field text-sm" 
                      value={editForm.name || ''} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">{t("code")}</label>
                      <input 
                        className="input-field text-sm" 
                        value={editForm.code || ''} 
                        onChange={e => setEditForm({...editForm, code: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">{t("color")}</label>
                      <input 
                        type="color" 
                        className="w-full h-10 p-1 rounded-xl cursor-pointer bg-surface border border-surface-border" 
                        value={editForm.color || '#000000'} 
                        onChange={e => setEditForm({...editForm, color: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-border">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-semibold text-text-primary">{t("lectures")}</label>
                      <button onClick={addLecture} className="text-[10px] bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-md hover:bg-accent-blue/20 flex items-center gap-1">
                        <Plus size={12} />{t('addLectureBtn')}</button>
                    </div>

                    <div className="space-y-2">
                      {editForm.lectures?.length === 0 && (
                        <p className="text-[10px] text-text-muted text-center py-2 bg-surface rounded-lg">{t('noLecturesSubject')}</p>
                      )}
                      {editForm.lectures?.map((lec, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-2 bg-surface rounded-lg border border-surface-border">
                          <div className="flex gap-2">
                            <select 
                              className="input-field text-xs flex-1 !p-1.5"
                              value={lec.dayOfWeek}
                              onChange={e => updateLecture(idx, { dayOfWeek: Number(e.target.value) })}
                            >
                              {DAYS_AR.map((day, i) => <option key={i} value={i}>{day}</option>)}
                            </select>
                            <button onClick={() => removeLecture(idx)} className="p-1.5 text-accent-red hover:bg-accent-red/10 rounded-md">
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
                            <input placeholder={t('room')} className="input-field text-xs !p-1 flex-1" value={lec.location || ''} onChange={e => updateLecture(idx, { location: e.target.value })} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={saveEdit} className="w-full btn-primary text-sm mt-2">{t('saveChanges')}</button>
                </div>
              )
            }

            return (
              <div key={sub.id} className="flex flex-col p-3 rounded-xl bg-surface-elevated border border-surface-border gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: sub.color }} />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{sub.name}</h3>
                      {sub.code && <p className="text-[10px] text-text-muted mt-0.5">{sub.code}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(sub)} className="p-2 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteSubject(sub.id!, sub.name)} className="p-2 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {sub.lectures && sub.lectures.length > 0 && (
                  <div className="pt-2 border-t border-surface-border flex flex-wrap gap-1.5">
                    {sub.lectures.map((lec, idx) => (
                      <div key={idx} className="text-[10px] px-2 py-1 bg-surface rounded-md text-text-secondary flex items-center gap-1 border border-surface-border/50">
                        <span className="font-medium">{DAYS_AR[lec.dayOfWeek]}</span>
                        <span>{lec.startTime}-{lec.endTime}</span>
                        {lec.location && <span className="text-text-muted">({lec.location})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-surface-border text-[10px] text-text-muted flex gap-2 leading-relaxed">
        <AlertCircle size={14} className="flex-shrink-0 text-accent-yellow" />
        <p>{t('lecturesAppearInCalendar')}.</p>
      
        </div>
        <div className="mt-4">
          <button 
            onClick={() => setShowAddSubject(true)} 
            className="w-full py-2.5 rounded-xl bg-accent-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> {t("addSubject")}
          </button>
        </div>
        {showAddSubject && <AddSubjectModal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} />}
      </Modal>
  )
}
