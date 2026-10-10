// @ts-nocheck
import React, { useEffect } from 'react'
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
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = '' };
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
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
      <div className={`modal-content w-full ${sizeClass} rounded-2xl`}>
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-surface-border">
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}
