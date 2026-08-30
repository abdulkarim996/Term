import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // "HH:mm"
  onChange: (val: string) => void;
}

export function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { h: '12', m: '00', p: 'AM' };
    const [hh, mm] = timeStr.split(':');
    let hNum = parseInt(hh, 10) || 12;
    let p = 'AM';
    if (hNum >= 12) {
      p = 'PM';
      if (hNum > 12) hNum -= 12;
    } else if (hNum === 0) {
      hNum = 12;
    }
    return { h: hNum.toString().padStart(2, '0'), m: mm || '00', p };
  };

  const { h, m, p } = parseTime(value);

  const updateTime = (newH: string, newM: string, newP: string) => {
    let hour24 = parseInt(newH, 10);
    if (newP === 'PM' && hour24 < 12) hour24 += 12;
    if (newP === 'AM' && hour24 === 12) hour24 = 0;
    const hh = hour24.toString().padStart(2, '0');
    onChange(`${hh}:${newM}`);
  };

  return (
    <div className="grid grid-cols-3 gap-1 w-full relative">
      <div className="relative">
        <select 
          value={h} 
          onChange={e => updateTime(e.target.value, m, p)}
          className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const val = (i + 1).toString().padStart(2, '0');
            return <option key={val} value={val}>{val}</option>;
          })}
        </select>
        
      </div>
      <div className="relative">
        <select 
          value={m} 
          onChange={e => updateTime(h, e.target.value, p)}
          className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
        >
          {Array.from({ length: 60 }, (_, i) => {
            const val = i.toString().padStart(2, '0');
            return <option key={val} value={val}>{val}</option>;
          })}
        </select>
        
      </div>
      <div className="relative">
        <select 
          value={p} 
          onChange={e => updateTime(h, m, e.target.value)}
          className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        
      </div>
    </div>
  );
}

interface CustomDateTimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

export function CustomDateTimePicker({ value, onChange }: CustomDateTimePickerProps) {
  const parseDateTime = (dtStr: string) => {
    if (!dtStr) {
      const now = new Date();
      return {
        Y: now.getFullYear().toString(),
        M: (now.getMonth() + 1).toString().padStart(2, '0'),
        D: now.getDate().toString().padStart(2, '0'),
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      };
    }
    const [datePart, timePart] = dtStr.split('T');
    const [Y, M, D] = (datePart || "").split('-');
    return { Y: Y || '', M: M || '', D: D || '', time: timePart || '12:00' };
  };

  const { Y, M, D, time } = parseDateTime(value);
  const currentYear = new Date().getFullYear();

  const updateDateTime = (newY: string, newM: string, newD: string, newTime: string) => {
    onChange(`${newY}-${newM}-${newD}T${newTime}`);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid grid-cols-3 gap-1 w-full relative">
        <div className="relative">
          <select 
            value={D} 
            onChange={e => updateDateTime(Y, M, e.target.value, time)}
            className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
          >
            {Array.from({ length: 31 }, (_, i) => {
              const val = (i + 1).toString().padStart(2, '0');
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          
        </div>
        <div className="relative">
          <select 
            value={M} 
            onChange={e => updateDateTime(Y, e.target.value, D, time)}
            className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const val = (i + 1).toString().padStart(2, '0');
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          
        </div>
        <div className="relative">
          <select 
            value={Y} 
            onChange={e => updateDateTime(e.target.value, M, D, time)}
            className="w-full bg-surface-elevated text-text-primary text-xs border border-surface-border rounded-lg p-2 text-center outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm appearance-none"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const val = (currentYear + i - 2).toString();
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          
        </div>
      </div>
      <CustomTimePicker value={time} onChange={(newTime) => updateDateTime(Y, M, D, newTime)} />
    </div>
  );
}
