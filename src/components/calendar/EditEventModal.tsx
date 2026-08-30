// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CustomDateTimePicker } from '../ui/CustomPickers';
import { useDataStore } from '../../store/dataStore'
import { cloudUpdateEvent, cloudUpdateTask, cloudUpdateSubject, cloudDeleteEvent, cloudDeleteTask } from '../../lib/firestore'
import Modal from '../ui/Modal'
import { useUIStore } from '../../store'
import { Trash2 } from 'lucide-react'

export default function EditEventModal({ isOpen, onClose, event }) {
  const { showToast } = useUIStore()
  const subjects = useDataStore(state => state.subjects)
  
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title.replace(/^.*:\s*/, '')) // remove prefix if any
      setStartDate(new Date(event.startDate).toISOString().slice(0, 16))
      setEndDate(new Date(event.endDate).toISOString().slice(0, 16))
    }
  }, [event])

  if (!event) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const startTs = new Date(startDate).getTime();
      const endTs = new Date(endDate).getTime();

      if (event.isLecture) {
        // Find subject and update specific lecture
        const subject = subjects.find(s => s.id === event.subjectId);
        if (subject) {
          const oldDay = new Date(event.startDate).getDay();
          const oldStartStr = new Date(event.startDate).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false});
          
          const newDay = new Date(startDate).getDay();
          const newStartStr = new Date(startDate).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false});
          const newEndStr = new Date(endDate).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false});
          
          const newLectures = subject.lectures.map(l => {
            if (l.dayOfWeek === oldDay && l.startTime === oldStartStr) {
              return { ...l, dayOfWeek: newDay, startTime: newStartStr, endTime: newEndStr }
            }
            return l;
          });
          
          await cloudUpdateSubject(String(subject.id), { lectures: newLectures });
        }
      } else if (event.isTask) {
        await cloudUpdateTask(String(event.originalId), { title, dueDate: startTs });
      } else {
        await cloudUpdateEvent(String(event.id), { title, startDate: startTs, endDate: endTs });
      }
      showToast(decodeURIComponent('%D8%AA%D9%85%20%D8%A7%D9%84%D8%AD%D9%81%D8%B8'), 'success');
      onClose();
    } catch(err) {
      showToast('Error', 'error');
    }
    setSaving(false);
  }

  const handleDelete = async () => {
    if (!window.confirm(decodeURIComponent('%D9%87%D9%84%20%D8%A3%D9%86%D8%AA%20%D9%85%D8%AA%D8%A3%D9%83%D8%AF%D8%9F'))) return;
    setSaving(true);
    try {
      if (event.isLecture) {
        const subject = subjects.find(s => s.id === event.subjectId);
        if (subject) {
          const oldDay = new Date(event.startDate).getDay();
          const oldStartStr = new Date(event.startDate).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false});
          const newLectures = subject.lectures.filter(l => !(l.dayOfWeek === oldDay && l.startTime === oldStartStr));
          await cloudUpdateSubject(String(subject.id), { lectures: newLectures });
        }
      } else if (event.isTask) {
        await cloudDeleteTask(String(event.originalId));
      } else {
        await cloudDeleteEvent(String(event.id));
      }
      showToast(decodeURIComponent('%D8%AA%D9%85%20%D8%A7%D9%84%D8%AD%D8%B0%D9%81'), 'info');
      onClose();
    } catch (err) {
      showToast('Error', 'error');
    }
    setSaving(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={decodeURIComponent('%D8%AA%D8%B9%D8%AF%D9%8A%D9%84%20%D8%A7%D9%84%D8%AD%D8%AF%D8%AB')}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">{decodeURIComponent('%D8%A7%D9%84%D8%B9%D9%86%D9%88%D8%A7%D9%86')}</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm text-text-primary"
            required
            disabled={event.isLecture}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">{decodeURIComponent('%D8%A7%D9%84%D8%A8%D8%AF%D8%A7%D9%8A%D8%A9')}</label>
            <CustomDateTimePicker value={startDate} onChange={(val) => { const e = { target: { value: val } }; (e => setStartDate(e.target.value))(e); }} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">{decodeURIComponent('%D8%A7%D9%84%D9%86%D9%87%D8%A7%D9%8A%D8%A9')}</label>
            <CustomDateTimePicker value={endDate} onChange={(val) => { const e = { target: { value: val } }; (e => setEndDate(e.target.value))(e); }} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-accent-blue text-white rounded-xl text-sm font-medium">
            {decodeURIComponent('%D8%AD%D9%81%D8%B8')}
          </button>
          <button type="button" onClick={handleDelete} disabled={saving} className="px-4 py-2.5 bg-accent-red/10 text-accent-red rounded-xl text-sm font-medium hover:bg-accent-red/20 transition-colors flex items-center justify-center">
            <Trash2 size={18} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
