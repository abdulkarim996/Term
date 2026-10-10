// @ts-nocheck
import { useTranslation } from '../../hooks/useTranslation'
import { useDataStore, DriveFile } from '../../store/dataStore'
import React, { useState, useEffect, useMemo } from 'react'
import {
  FolderOpen, FileText, Image as ImageIcon, Film, File,
  Search, ArrowUpDown, Calendar, BookOpen
} from 'lucide-react'
import { useUIStore, useSettingsStore } from '../../store'
import { ErrorBoundary } from 'react-error-boundary'

const FileAnnotator = React.lazy(() => import('./FileAnnotator'))

const MIME_ICONS: Record<string, React.ReactNode> = {
  'application/pdf': <FileText size={18} className="text-accent-red" />,
  'application/vnd.ms-powerpoint': <FileText size={18} className="text-accent-orange" />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': <FileText size={18} className="text-accent-orange" />,
  'application/msword': <FileText size={18} className="text-accent-blue" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText size={18} className="text-accent-blue" />
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <File size={18} className="text-text-muted" />
  if (MIME_ICONS[mimeType]) return MIME_ICONS[mimeType]
  if (mimeType.startsWith('image/')) return <ImageIcon size={18} className="text-accent-green" />
  if (mimeType.startsWith('video/')) return <Film size={18} className="text-accent-purple" />
  return <File size={18} className="text-text-muted" />
}

export default function FileViewer() {
  const { t } = useTranslation();
  const { dir, language } = useSettingsStore();
  const isRtl = dir === 'rtl' || language === 'ar';

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)

  const subjects = useDataStore(state => state.subjects)
  const allFiles = useDataStore(state => state.driveFiles)

  const subjectMap = useMemo(() => {
    return Object.fromEntries((subjects ?? []).map((s) => [String(s.id), s]))
  }, [subjects])

  const CATEGORIES = [
    { id: 'all', label: t('all') },
    { id: 'lectures', label: t('catLectures') },
    { id: 'assignments', label: t('catAssignments') },
    { id: 'exams', label: t('catExams') },
    { id: 'projects', label: t('catProjects') },
    { id: 'other', label: t('catOther') }
  ];

  const formatSizeSafe = (bytes?: string | number) => {
    if (!bytes) return '';
    const num = Number(bytes);
    if (isNaN(num)) return '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / 1024 / 1024).toFixed(1)} MB`;
  }

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }).format(d);
  }

  useEffect(() => {
    const quickFile = useUIStore.getState().quickReviewFile;
    if (quickFile) {
      setSelectedFile(quickFile);
      useUIStore.getState().setQuickReviewFile(null);
    }
  }, []);

  useEffect(() => {
    useUIStore.getState().setActiveStudyFile(selectedFile);
    return () => {
      useUIStore.getState().setActiveStudyFile(null);
    };
  }, [selectedFile]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return (allFiles ?? []).filter((f) => {
      const matchSub = selectedSubjectId === null
        ? true
        : (selectedSubjectId === 'uncategorized' ? !f.subjectId : String(f.subjectId) === selectedSubjectId)
      
      const matchCat = categoryFilter === 'all'
        ? true
        : (categoryFilter === 'other'
            ? (!f.category || f.category === 'other' || !['lectures', 'assignments', 'exams', 'projects'].includes(f.category))
            : f.category === categoryFilter)

      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
      return matchSub && matchCat && matchSearch
    })
  }, [allFiles, selectedSubjectId, categoryFilter, search])

  // Sort files
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      if (sortBy === 'date') {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : (a.syncedAt || 0)
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : (b.syncedAt || 0)
        return timeB - timeA
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      } else {
        return (Number(b.size) || 0) - (Number(a.size) || 0)
      }
    })
  }, [filteredFiles, sortBy])

  const hasUncategorizedFiles = (allFiles ?? []).some(f => !f.subjectId)

  if (selectedFile) {
    return (
      <ErrorBoundary 
        fallbackRender={({ error, resetErrorBoundary }) => {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.includes('ResizeObserver')) {
            setTimeout(resetErrorBoundary, 0);
            return null;
          }
          return <div className="p-4 text-accent-red">{t('errorOccurred')} 😔. يرجى المحاولة مرة أخرى.</div>;
        }}
      >
        <React.Suspense fallback={<div className="p-4 text-center">جاري تحميل المعاين...</div>}>
          <FileAnnotator file={selectedFile} onClose={() => setSelectedFile(null)} />
        </React.Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-elevated rounded-2xl shadow-sm border border-surface-border overflow-hidden">
      {/* Header & Filters Area */}
      <div className="p-4 border-b border-surface-border space-y-3 bg-surface/50 backdrop-blur-sm">
        {/* Title & Count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0">
              <FolderOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary leading-tight">{t('studyFiles')}</h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                {sortedFiles.length} {t('filesFromDrive')}
              </p>
            </div>
          </div>
        </div>

        {/* Category Segmented Tabs & Sort Button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          <div className="segmented-container flex-1 max-w-xl">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`segmented-tab ${categoryFilter === cat.id ? 'segmented-tab-active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSortBy(prev => prev === 'date' ? 'name' : prev === 'name' ? 'size' : 'date')
            }}
            className="icon-btn px-3 w-auto flex items-center gap-1.5 text-xs font-medium shrink-0"
            title={sortBy === 'date' ? (language === 'ar' ? 'التاريخ' : 'Date') : sortBy === 'name' ? (language === 'ar' ? 'الاسم' : 'Name') : (language === 'ar' ? 'الحجم' : 'Size')}
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">
              {sortBy === 'date' ? (language === 'ar' ? 'التاريخ' : 'Date') :
               sortBy === 'name' ? (language === 'ar' ? 'الاسم' : 'Name') :
               (language === 'ar' ? 'الحجم' : 'Size')}
            </span>
          </button>
        </div>

        {/* Subject Filter Chips */}
        {subjects && subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubjectId(null)}
              className={`chip ${selectedSubjectId === null ? 'active' : ''}`}
            >
              {t('allSubjects')}
            </button>
            {subjects.map((subject: any) => {
              const isSelected = selectedSubjectId === String(subject.id)
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(isSelected ? null : String(subject.id))}
                  className={`chip ${isSelected ? 'active' : ''}`}
                  style={{
                    backgroundColor: isSelected ? `${subject.color}25` : undefined,
                    borderColor: isSelected ? subject.color : undefined,
                    color: isSelected ? subject.color : undefined
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                  {subject.name}
                </button>
              )
            })}
            {hasUncategorizedFiles && (
              <button
                onClick={() => setSelectedSubjectId(selectedSubjectId === 'uncategorized' ? null : 'uncategorized')}
                className={`chip ${selectedSubjectId === 'uncategorized' ? 'active' : ''}`}
              >
                <div className="w-2 h-2 rounded-full bg-text-muted/60" />
                {t('uncategorized')}
              </button>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-text-muted`} />
          <input
            className={`input-field text-sm ${isRtl ? 'pl-9 pr-3' : 'pr-9 pl-3'}`}
            placeholder={t('searchFile')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* File List — Card design matching Tasks & Storage */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allFiles === undefined ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="glass-card text-center py-12 px-4">
            <FolderOpen size={44} className="mx-auto text-text-muted/40 mb-3" />
            <h3 className="text-base font-semibold text-text-primary mb-1">
              {allFiles.length === 0 ? t('noFilesList') : t('noFilesFound')}
            </h3>
            <p className="text-xs text-text-muted">
              {allFiles.length === 0
                ? `${t('addFilesFrom')} ${t('storage')}`
                : (language === 'ar' ? 'لا توجد ملفات تطابق الفلتر الحالي' : 'No files match current filters')}
            </p>
          </div>
        ) : (
          sortedFiles.map(file => {
            const subject = file.subjectId ? subjectMap[String(file.subjectId)] : null
            const categoryObj = CATEGORIES.find(c => c.id === file.category)
            const categoryLabel = categoryObj ? categoryObj.label : file.category

            return (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className="glass-card overflow-hidden transition-all duration-200 hover:border-accent-blue/40 cursor-pointer group"
                style={{
                  ...(isRtl
                    ? {
                        borderRightWidth: subject ? '4px' : undefined,
                        borderRightColor: subject ? subject.color : undefined,
                      }
                    : {
                        borderLeftWidth: subject ? '4px' : undefined,
                        borderLeftColor: subject ? subject.color : undefined,
                      })
                }}
              >
                <div className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shadow-xs">
                    {getFileIcon(file.mimeType)}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base text-text-primary truncate group-hover:text-accent-blue transition-colors">
                      {file.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-text-muted mt-1">
                      {/* Subject Dot & Name */}
                      {subject ? (
                        <div className="flex items-center gap-1.5 font-medium" style={{ color: subject.color }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">{subject.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <div className="w-2 h-2 rounded-full bg-text-muted/40" />
                          <span>{t('uncategorized')}</span>
                        </div>
                      )}

                      {/* Category Badge */}
                      {categoryLabel && (
                        <span className="px-2 py-0.5 rounded-md bg-surface text-text-secondary text-[10px] font-medium">
                          {categoryLabel}
                        </span>
                      )}

                      {/* Date with Calendar icon */}
                      {file.modifiedTime && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar size={12} />
                          <span>{formatDateSafe(file.modifiedTime)}</span>
                        </div>
                      )}

                      {/* File Size */}
                      {file.size && (
                        <span className="font-mono text-[11px] text-text-muted">
                          {formatSizeSafe(file.size)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Open in Study Room */}
                  <div className="flex items-center gap-1.5 shrink-0 text-text-muted group-hover:text-accent-purple transition-colors pr-1 rtl:pr-0 rtl:pl-1">
                    <span className="text-xs font-semibold hidden sm:inline">
                      {language === 'ar' ? 'مذاكرة' : 'Study'}
                    </span>
                    <BookOpen size={16} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
