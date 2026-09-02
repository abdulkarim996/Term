// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { CheckCircle } from 'lucide-react'
import { isSameDay, isToday } from '../../lib/utils'

export default function TimeGrid({ events, selectedDate, view, onEventClick, getEventColor, subjects }) {
  const { t, language } = useTranslation();
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const startHour = 6;
  const endHour = 24;
  const hourHeight = 60; // 1px = 1 minute

  const days = view === 'day' 
    ? [new Date(selectedDate)] 
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date(selectedDate);
        const diff = d.getDay();
        d.setDate(d.getDate() - diff + i);
        return d;
      });

  return (
    <div className="relative flex" style={{ height: (endHour - startHour) * hourHeight }}>
      {/* Time axis */}
      <div className="w-16 border-l border-[#2a2a2a] flex flex-col shrink-0 sticky left-0 z-20 bg-background">
        {Array.from({ length: endHour - startHour }).map((_, i) => (
          <div key={i} className="text-[10px] text-text-muted text-center border-b border-[#2a2a2a]" style={{ height: hourHeight }}>
            {`${(startHour + i).toString().padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex flex-1 relative">
        {/* Red Line */}
          {days.some(d => isToday(d.getTime())) && now.getHours() >= startHour && (
            <div 
              className="absolute left-0 right-0 border-t-[2px] border-red-500 z-30 pointer-events-none before:content-[''] before:absolute before:-top-[5px] before:-left-1 before:w-2 before:h-2 before:bg-red-500 before:rounded-full before:shadow-md before:shadow-red-500/50" 
              style={{ top: (now.getHours() - startHour) * hourHeight + now.getMinutes() }}
            />
          )}
        {days.map((day, i) => {
          const dayTs = day.getTime();
          const dayOfWeek = day.getDay();
          const generatedLectures = [];
          if (subjects) {
            subjects.forEach(subject => {
              if (subject.lectures) {
                subject.lectures.forEach(lec => {
                  if (lec.dayOfWeek === dayOfWeek) {
                    const [startH, startM] = lec.startTime.split(':').map(Number)
                    const [endH, endM] = lec.endTime.split(':').map(Number)
                    const startDt = new Date(dayTs)
                    startDt.setHours(startH, startM, 0, 0)
                    const endDt = new Date(dayTs)
                    endDt.setHours(endH, endM, 0, 0)
                    generatedLectures.push({
                      id: `lec_${subject.id}_${dayTs}_${lec.startTime}`,
                      isLecture: true,
                      title: subject.name,
                      type: 'lecture',
                      startDate: startDt.getTime(),
                      endDate: endDt.getTime(),
                      subjectId: subject.id,
                      location: lec.location,
                      code: subject.code
                    })
                  }
                })
              }
            })
          }
          const dayEvents = [...events.filter(e => isSameDay(e.startDate, dayTs)), ...generatedLectures].sort((a,b) => a.startDate - b.startDate);

          
          return (
            <div key={i} className="flex-1 min-w-[120px] md:min-w-0 border-l border-[#2a2a2a] relative">
              {/* Grid Lines */}
              {Array.from({ length: endHour - startHour }).map((_, j) => (
                <div key={j} className="border-b border-[#2a2a2a] w-full" style={{ height: hourHeight }} />
              ))}

              

              {/* Events & Gaps */}
              {(() => {
                // Overlap calculation
                const columns = [];
                const layoutEvents = dayEvents.map(ev => {
                  let placed = false;
                  let colIdx = 0;
                  for (let i = 0; i < columns.length; i++) {
                    const lastEvent = columns[i][columns[i].length - 1];
                    if (lastEvent.endDate <= ev.startDate) {
                      columns[i].push(ev);
                      colIdx = i;
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) {
                    columns.push([ev]);
                    colIdx = columns.length - 1;
                  }
                  return { ...ev, colIdx };
                });
                
                // For simplicity, maxCols in the day is columns.length, but it should ideally be per cluster. 
                // We'll use a local cluster max logic.
                const maxCols = columns.length;

                return layoutEvents.map((ev, idx) => {
                  const s = new Date(ev.startDate);
                  const e = new Date(ev.endDate);
                  
                  let top = (s.getHours() - startHour) * hourHeight + s.getMinutes();
                  if (top < 0) top = 0;
                  let height = ((e.getTime() - s.getTime()) / 60000);
                  if (height < 20) height = 20;
                  
                  // Count concurrent events for this specific event
                  let concurrent = 1;
                  for (const other of layoutEvents) {
                    if (other.id !== ev.id && other.startDate < ev.endDate && other.endDate > ev.startDate) {
                      concurrent++;
                    }
                  }

                  const width = concurrent > 1 ? (100 / maxCols) : 100;
                  const left = concurrent > 1 ? (ev.colIdx * (100 / maxCols)) : 0;

                  // Gap block: position it in the MIDDLE of the gap, never on top of an event
                  let gapBlock = null;
                  if (idx < layoutEvents.length - 1 && maxCols === 1) {
                    const nextS = new Date(layoutEvents[idx+1].startDate);
                    const gapMins = (nextS.getTime() - e.getTime()) / 60000;
                    if (gapMins > 15) {
                      const hours = Math.floor(gapMins / 60);
                      const mins = Math.round(gapMins % 60);
                      const gapText = language === 'en'
                        ? `Break ${hours > 0 ? hours + 'h ' : ''}${mins}m`
                        : `فراغ ${hours > 0 ? hours + 'س ' : ''}${mins}د`;
                      // Place label in the vertical center of the gap
                      const gapTop = top + height + (gapMins / 2) - 10;
                      gapBlock = (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-400 bg-[#121212]/90 px-2 py-0.5 rounded-full border border-gray-800 z-[5] whitespace-nowrap pointer-events-none"
                          style={{ top: gapTop }}
                        >
                          {gapText}
                        </div>
                      );
                    }
                  }

                  return (
                    <React.Fragment key={ev.id}>
                      <div
                        onClick={() => onEventClick(ev)}
                        className={`absolute rounded-lg p-1.5 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all z-10 overflow-hidden ${ev.type === "task" ? "shadow-inner bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]" : "shadow-sm border border-white/10"}`}
                        style={{
                          top,
                          height,
                          left: `${left}%`,
                          width: `calc(${width}% - 4px)`,
                          marginLeft: '2px',
                          backgroundColor: getEventColor(ev) + '20',
                          borderRight: `3px solid ${getEventColor(ev)}`
                        }}>
                        <div className="text-[10px] font-bold text-white flex items-center gap-1 overflow-hidden">
                          {ev.type === "task" && <CheckCircle size={12} className="opacity-70 shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        <div className="text-[9px] text-text-secondary truncate mt-0.5">
                          {s.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})} - {e.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}
                        </div>
                        {ev.isLecture && (ev.location || ev.code) && (
                          <>
                            {ev.code && (
                              <div className="text-[9px] text-text-secondary truncate mt-0.5 font-medium opacity-90">
                                {ev.code}
                              </div>
                            )}
                            {ev.location && (
                              <div className="text-[9px] text-text-secondary truncate mt-0.5 font-medium opacity-80">
                                {t('room')} {ev.location}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {gapBlock}
                    </React.Fragment>
                  )
                });
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
