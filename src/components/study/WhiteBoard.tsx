// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import MiniTimer from './MiniTimer'

export default function WhiteBoard() {
  const [initialData, setInitialData] = useState<any>(null)
  
  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('excalidraw_data')
    if (saved) {
      try {
        setInitialData(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse excalidraw data')
      }
    } else {
      setInitialData({ elements: [], appState: {} })
    }
  }, [])

  const onChange = (elements: readonly any[], appState: any) => {
    // Debounce or save directly
    const data = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } }
    localStorage.setItem('excalidraw_data', JSON.stringify(data))
  }

  if (!initialData) return <div className="flex-1 w-full h-full flex items-center justify-center bg-white rounded-2xl"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-border overflow-hidden">
      
      {/* Top Bar for WhiteBoard */}
      <div className="flex items-center justify-center px-4 py-2 border-b border-surface-border bg-surface-elevated">
         <MiniTimer />
      </div>

      <div className="flex-1 w-full relative" style={{ height: '60vh', minHeight: '400px' }}>
        <Excalidraw
          initialData={initialData}
          onChange={onChange}
          langCode="ar-SA"
        />
      </div>
    </div>
  )
}
