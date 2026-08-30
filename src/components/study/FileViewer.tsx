import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import React, { useState } from 'react'
import { DriveFile } from '../../store/dataStore'
import { FolderOpen, FileText, Image as ImageIcon, ExternalLink, Filter, FileType } from 'lucide-react'
import { SUBJECT_COLORS } from '../../lib/utils'
import FileAnnotator from './FileAnnotator'

import { ErrorBoundary } from 'react-error-boundary'

export default function FileViewer() {
  const { t } = useTranslation();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | string>('all')
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)

  // early return removed from here

  const subjects = useDataStore(state => state.subjects)
  
  const allFiles = useDataStore(state => state.driveFiles);
  const files = (() => {
    let results = allFiles || [];
    if (selectedSubjectId !== 'all') {
      results = results.filter((f: any) => String(f.subjectId) === String(selectedSubjectId));
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const getSubjectColor = (sid?: number | string) => {
    if (!sid || !subjects) return '#9ca3af'
    const sub = subjects.find(s => s.id === sid)
    return sub ? sub.color : '#9ca3af'
  }

  const getSubjectName = (sid?: number | string) => {
    if (!sid || !subjects) return t('uncategorized')
    const sub = subjects.find(s => s.id === sid)
    return sub ? sub.name : t('uncategorized')
  }

  if (selectedFile) {


    return (
      <ErrorBoundary fallback={<div className="p-4 text-accent-red">{t('errorOccurred')} في عرض الملف. يرجى إعادة المحاولة.</div>}>
        <FileAnnotator file={selectedFile} onClose={() => setSelectedFile(null)} />
      </ErrorBoundary>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-elevated rounded-2xl shadow-sm border border-surface-border">
      {/* Header & Filter */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={20} className="text-accent-blue" />
          <h2 className="text-lg font-bold text-text-primary">{t('studyFiles')}</h2>
        </div>
        
        <div className="relative">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="input-field w-full appearance-none pr-10 text-sm"
          >
            <option value="all">{t('allSubjects')}</option>
            {subjects?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {files === undefined ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
        ) : files.length === 0 ? (
          <div className="text-center p-8 text-text-muted">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p>{t('noFilesList')} {selectedSubjectId !== 'all' ? t('forThisSubject') : ''}</p>
            <p className="text-xs mt-1">{t('addFilesFrom')} t('storage')</p>
          </div>
        ) : (
          files.map(file => (
            <div
              key={file.id}
              onClick={() => setSelectedFile(file)}
              className="block bg-surface-elevated border border-surface-border p-3 rounded-xl hover:border-accent-blue transition-colors group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {file.mimeType?.includes('image') ? (
                    <ImageIcon size={20} className="text-accent-purple" />
                  ) : (
                    <FileText size={20} className="text-accent-blue" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate mb-1 group-hover:text-accent-blue transition-colors">
                    {file.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${getSubjectColor(file.subjectId)}20`,
                        color: getSubjectColor(file.subjectId)
                      }}
                    >
                      {getSubjectName(file.subjectId)}
                    </span>
                    {file.category && (
                      <span className="text-[10px] text-text-muted bg-surface px-2 py-0.5 rounded-full">
                        {file.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
