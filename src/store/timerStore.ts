// @ts-nocheck
import { create } from 'zustand'

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak' | 'custom'

interface TimerStore {
  timeLeft: number
  isActive: boolean
  mode: TimerMode
  customMins: number
  
  setTimeLeft: (t: number | ((prev: number) => number)) => void
  setIsActive: (active: boolean) => void
  setMode: (mode: TimerMode) => void
  setCustomMins: (mins: number) => void
  resetTimer: () => void
}

export const useTimerStore = create<TimerStore>()((set, get) => ({
  timeLeft: 25 * 60,
  isActive: false,
  mode: 'pomodoro',
  customMins: 60,
  
  setTimeLeft: (t) => set((state) => ({ timeLeft: typeof t === 'function' ? t(state.timeLeft) : t })),
  setIsActive: (active) => set({ isActive: active }),
  setMode: (mode) => set({ mode }),
  setCustomMins: (mins) => set({ customMins: mins }),
  
  resetTimer: () => {
    const { mode, customMins } = get()
    let mins = 25
    if (mode === 'shortBreak') mins = 5
    if (mode === 'longBreak') mins = 15
    if (mode === 'custom') mins = customMins
    set({ timeLeft: mins * 60, isActive: false })
  }
}))
