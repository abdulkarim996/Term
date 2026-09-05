// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import MiniTimer from './MiniTimer'
import { useDataStore } from '../../store/dataStore'

export default function WhiteBoard() {
  const whiteboardData = useDataStore((state) => state.whiteboardData)
  const setWhiteboardData = useDataStore((state) => state.setWhiteboardData)
  const [initialData, setInitialData] = useState<any>(null)
  
  useEffect(() => {
    if (whiteboardData) {
      setInitialData(whiteboardData)
    } else {
      // Load from local storage
      const saved = localStorage.getItem('excalidraw_data')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setInitialData(parsed)
          setWhiteboardData(parsed)
        } catch (e) {
          console.error('Failed to parse excalidraw data')
          setInitialData({ elements: [], appState: {} })
        }
      } else {
        setInitialData({ elements: [], appState: {} })
      }
    }
  }, [])

  const onChange = useCallback((elements: readonly any[], appState: any) => {
    // Debounce or save directly
    const data = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } }
    localStorage.setItem('excalidraw_data', JSON.stringify(data))
    setWhiteboardData(data)
  }, [setWhiteboardData])

  if (!initialData) return <div className="flex-1 w-full h-full flex items-center justify-center bg-white rounded-2xl"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-border overflow-hidden">
      
      {/* Top Bar for WhiteBoard */}
      <div className="flex items-center justify-center px-4 py-2 border-b border-surface-border bg-surface-elevated">
         <MiniTimer />
      </div>

      <div className="flex-1 w-full relative h-full">
        <Excalidraw
          initialData={initialData}
          onChange={onChange}
          langCode="ar-SA"
        />
      </div>
    </div>
  )
}
