// @ts-nocheck
import React, { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onDismiss: () => void
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info }

const colors = {
  success: 'text-accent-green',
  error: 'text-accent-red',
  info: 'text-accent-blue' }

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const Icon = icons[type]

  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  return (
    <div className="toast shadow-card animate-slide-up">
      <Icon size={16} className={colors[type]} />
      <span className="text-text-primary flex-1">{message}</span>
      <button onClick={onDismiss} className="text-text-muted hover:text-text-primary">
        <X size={14} />
      </button>
    </div>
  )
}
