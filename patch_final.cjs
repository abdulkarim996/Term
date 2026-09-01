const fs = require('fs');

// 1. Fix Modal.tsx
let modalTsx = \import React, { useEffect, useRef } from 'react'
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
      <div className={\modal-content w-full \ rounded-xl2\}>
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-surface-border">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}
\;
fs.writeFileSync('src/components/ui/Modal.tsx', modalTsx);

// 2. Fix index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(
  /\\/\\* Modal overlay \\*\\/[\\s\\S]*?\\.modal-content \\{[\\s\\S]*?\\}/,
  \/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.modal-content {
  @apply glass-card animate-slide-up flex flex-col;
  max-height: calc(100vh - 2rem);
}\
);
fs.writeFileSync('src/index.css', css);

// 3. Remove nested scrolling from AddSubjectModal and ManageSubjectsModal
let addSub = fs.readFileSync('src/components/tasks/AddSubjectModal.tsx', 'utf8');
addSub = addSub.replace(/className="space-y-4.*?"/g, 'className="space-y-4"');
fs.writeFileSync('src/components/tasks/AddSubjectModal.tsx', addSub);

let mngSub = fs.readFileSync('src/components/more/ManageSubjectsModal.tsx', 'utf8');
mngSub = mngSub.replace(/className="space-y-4.*?"/g, 'className="space-y-4"');
fs.writeFileSync('src/components/more/ManageSubjectsModal.tsx', mngSub);

