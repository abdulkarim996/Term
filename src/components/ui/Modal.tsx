// @ts-nocheck
import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const sizeClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl'
  }[size]

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div 
        className="modal-wrapper min-h-full p-4 flex pointer-events-none"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className={`modal-content m-auto w-full ${sizeClass} rounded-xl2 pointer-events-auto`}>
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <h2 className="text-base font-semibold text-text-primary">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
