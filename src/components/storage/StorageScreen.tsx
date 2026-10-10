// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudDeleteDriveFile, cloudUpdateDriveFile, cloudAddDriveFile } from '../../lib/firestore'
import React, { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import {
  FolderOpen, ExternalLink, File, FileText,
  Image, Film, Search, Folder,
  RefreshCw, Loader2, Link, Pencil, BookOpen,
  Calendar, ArrowUpDown
} from 'lucide-react'
import type { DriveFile } from '../../store/dataStore'
import { useSettingsStore, useUIStore } from '../../store'
import AddSubjectModal from '../tasks/AddSubjectModal'
import Modal from '../ui/Modal'

const MIME_ICONS: Record<string, React.ReactNode> = {
  'application/pdf': <FileText size={18} className="text-accent-red" />,
  'application/vnd.ms-powerpoint': <FileText size={18} className="text-accent-orange" />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': <FileText size={18} className="text-accent-orange" />,
  'application/msword': <FileText size={18} className="text-accent-blue" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText size={18} className="text-accent-blue" />
}

function getFileIcon(mimeType: string) {
  if (MIME_ICONS[mimeType]) return MIME_ICONS[mimeType]
  if (mimeType.startsWith('image/')) return <Image size={18} className="text-accent-green" />
  if (mimeType.startsWith('video/')) return <Film size={18} className="text-accent-purple" />
  return <File size={18} className="text-text-muted" />
}

export default function StorageScreen() {
  const { t } = useTranslation();
  const { dir, language, googleAccessToken, setGoogleTokens } = useSettingsStore()
  const isRtl = dir === 'rtl' || language === 'ar'
  const { showToast } = useUIStore()

  const CATEGORIES = [
    { id: 'lectures', name: 'catLectures' },
    { id: 'assignments', name: 'catAssignments' },
    { id: 'exams', name: 'catExams' },
    { id: 'projects', name: 'catProjects' },
    { id: 'other', name: 'catOther' }
  ];

  const formatSizeSafe = (bytes?: string | number) => {
    if (!bytes) return t('unknownSize') || 'Unknown';
    const num = Number(bytes);
    if (isNaN(num)) return t('unknownSize') || 'Unknown';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / 1024 / 1024).toFixed(1)} MB`;
  }

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return t('unknownSize') || 'Unknown';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return t('unknownSize') || 'Unknown';
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }).format(d);
  }

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)

  const subjects = useDataStore(state => state.subjects)
  const driveFiles = useDataStore(state => state.driveFiles)

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [String(s.id), s]))

  // Filter files matching category, subject and search query
  const filteredFiles = (driveFiles ?? []).filter((f) => {
    const matchSub = selectedSubject === null 
      ? true 
      : (selectedSubject === 'uncategorized' ? !f.subjectId : String(f.subjectId) === selectedSubject)
    
    const matchCat = categoryFilter === 'all' 
      ? true 
      : (categoryFilter === 'other' 
          ? (!f.category || f.category === 'other' || !['lectures', 'assignments', 'exams', 'projects'].includes(f.category))
          : f.category === categoryFilter)

    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchCat && matchSearch
  })

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
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

  const GOOGLE_CLIENT_ID = '599529502181-tnj9vv8krmj2eled81omkb3i2k2h1p8q.apps.googleusercontent.com'

  const handleConnectDrive = () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/oauth-callback`,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      include_granted_scopes: 'true'
    })
    window.open(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, '_blank', 'width=500,height=600')
  }

  const syncDriveFiles = async () => {
    if (!googleAccessToken) {
      showToast(t('linkGoogleDriveFirst'), 'error')
      return
    }
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${googleAccessToken}` }
      const folderName = 'Student Dashboard'
      const folderQuery = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
      const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id)`, { headers })
      const folderData = await folderRes.json()
      
      if (!folderRes.ok) {
        if (folderRes.status === 401) {
          setGoogleTokens('', '')
          throw new Error('Token expired')
        }
        throw new Error(folderData.error?.message || 'Drive API error')
      }

      let folderId = ''
      if (folderData.files && folderData.files.length > 0) {
        folderId = folderData.files[0].id
      } else {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' })
        })
        const createData = await createRes.json()
        folderId = createData.id
      }

      const filesQuery = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id,name,mimeType,size,webViewLink,thumbnailLink,modifiedTime)&pageSize=100`,
        { headers }
      )

      if (!res.ok) throw new Error('Drive API error')

      const data = await res.json()
      const files: DriveFile[] = data.files.map((f: Record<string, string>) => ({
        driveFileId: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? Number(f.size) : undefined,
        webViewLink: f.webViewLink,
        thumbnailLink: f.thumbnailLink,
        modifiedTime: f.modifiedTime,
        syncedAt: Date.now()
      }))

      const newFileIds = new Set(files.map(f => f.driveFileId))
      const oldFiles = await useDataStore.getState().driveFiles
      for (const oldFile of oldFiles) {
        if (!newFileIds.has(oldFile.driveFileId)) {
          await cloudDeleteDriveFile(String(oldFile.id!))
        }
      }

      for (const file of files) {
        const existing = useDataStore.getState().driveFiles.find((f: any) => f.driveFileId === file.driveFileId)
        if (existing) {
          await cloudUpdateDriveFile(String(existing.id!), { ...file, subjectId: existing.subjectId })
        } else {
          await cloudAddDriveFile(file)
        }
      }

      showToast(t('syncSuccess'), 'success')
    } catch (error: any) {
      console.error("Sync error:", error)
      showToast(error.message || 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const isConnected = !!googleAccessToken

  // Edit Modal State
  const [editingFile, setEditingFile] = useState<DriveFile | null>(null)
  const [editSubId, setEditSubId] = useState<string>('')
  const [editCat, setEditCat] = useState<string>('')
  const [customCat, setCustomCat] = useState<string>('')

  const openEditModal = (file: DriveFile) => {
    setEditingFile(file)
    setEditSubId(file.subjectId ? String(file.subjectId) : '')
    
    const cat = file.category || ''
    if (cat && !CATEGORIES.find(c => c.id === cat)) {
      setEditCat('other')
      setCustomCat(cat)
    } else {
      setEditCat(cat)
      setCustomCat('')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingFile) return
    const finalCat = editCat === 'other' ? customCat : editCat
    const finalSub = editSubId === '' ? undefined : editSubId
    
    await cloudUpdateDriveFile(String(editingFile.id!), { 
      subjectId: finalSub, 
      category: finalCat || undefined 
    })
    
    showToast(t('changesSaved'), 'success')
    setEditingFile(null)
  }

  const hasUncategorizedFiles = (driveFiles ?? []).some(f => !f.subjectId)

  return (
    <div className="page-container">
      {/* Header — identical layout to Tasks */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('storage')}</h1>
          <p className="page-subtitle">
            {sortedFiles.length} {t('filesFromDrive')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddSubject(true)}
            className="icon-btn"
            title={t('addSubject') || 'Add Subject'}
          >
            <Folder size={16} />
          </button>
          {isConnected ? (
            <button
              onClick={syncDriveFiles}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>{t('sync')}</span>
            </button>
          ) : (
            <button onClick={handleConnectDrive} className="btn-primary">
              <Link size={14} />
              <span>{t('linkDrive')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Banner */}
      {!isConnected && (
        <div className="glass-card p-4 border-accent-blue/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center flex-shrink-0">
              <FolderOpen size={20} className="text-accent-blue" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary">{t('linkGoogleDrive')}</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {t('linkDriveDesc')}
              </p>
              <button onClick={handleConnectDrive} className="btn-primary mt-3 text-xs">
                <Link size={12} />
                {t('linkAccount')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Sort — matching Tasks layout */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar pb-1">
        <div className="segmented-container flex-1 max-w-xl">
          {[
            { id: 'all', label: t('all') },
            { id: 'lectures', label: t('catLectures') },
            { id: 'assignments', label: t('catAssignments') },
            { id: 'exams', label: t('catExams') },
            { id: 'projects', label: t('catProjects') },
            { id: 'other', label: t('catOther') },
          ].map((cat) => (
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

      {/* Subject Filter Chips — wrap layout matching Tasks */}
      {subjects && subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`chip ${selectedSubject === null ? 'active' : ''}`}
          >
            {t('allSubjects')}
          </button>
          {subjects.map((subject: any) => {
            const isSelected = selectedSubject === String(subject.id)
            return (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(isSelected ? null : String(subject.id))}
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
              onClick={() => setSelectedSubject(selectedSubject === 'uncategorized' ? null : 'uncategorized')}
              className={`chip ${selectedSubject === 'uncategorized' ? 'active' : ''}`}
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

      {/* Files List — Card design matching Tasks */}
      <div className="space-y-3">
        {sortedFiles.length === 0 ? (
          <div className="glass-card text-center py-12 px-4">
            <FolderOpen size={44} className="mx-auto text-text-muted/40 mb-3" />
            <h3 className="text-base font-semibold text-text-primary mb-1">
              {isConnected ? t('noFilesFound') : t('linkGoogleDrive')}
            </h3>
            <p className="text-xs text-text-muted">
              {isConnected 
                ? (language === 'ar' ? 'لا توجد ملفات تطابق الفلتر الحالي' : 'No files match current filters') 
                : t('linkDriveDesc')}
            </p>
          </div>
        ) : (
          sortedFiles.map((file) => {
            const subject = file.subjectId ? subjectMap[String(file.subjectId)] : null
            const categoryObj = CATEGORIES.find(c => c.id === file.category)
            const categoryLabel = categoryObj ? t(categoryObj.name) : file.category

            return (
              <div
                key={file.id}
                className="glass-card overflow-hidden transition-all duration-200 hover:border-accent-blue/40"
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
                <div className="p-4 flex items-center gap-3 sm:gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base text-text-primary truncate">
                      {file.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        useUIStore.getState().setQuickReviewFile(file)
                        useUIStore.getState().setActiveTab('study')
                      }}
                      className="p-2 rounded-xl text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 transition-colors"
                      title={language === 'ar' ? 'فتح في غرفة المذاكرة' : 'Open in Study Room'}
                    >
                      <BookOpen size={16} />
                    </button>

                    <button
                      onClick={() => openEditModal(file)}
                      className="p-2 rounded-xl text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                      title={t('edit') || 'Edit'}
                    >
                      <Pencil size={16} />
                    </button>

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                        title={t('openInDrive') || 'Open in Google Drive'}
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit File Modal */}
      <Modal isOpen={!!editingFile} onClose={() => setEditingFile(null)} title={t('fileCategory')}>
        {editingFile && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">{t('subject')}</label>
              <select
                className="input-field w-full"
                value={editSubId}
                onChange={(e) => setEditSubId(e.target.value)}
              >
                <option value="">{t('noSubject')}</option>
                {subjects?.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">{t('fileType')}</label>
              <select
                className="input-field w-full"
                value={editCat}
                onChange={(e) => setEditCat(e.target.value)}
              >
                <option value="">{t('uncategorized')}</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{t(c.name)}</option>
                ))}
              </select>
            </div>

            {editCat === 'other' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">{t('customCategory')}</label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder={t('writeCategoryName')}
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                />
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button onClick={() => setEditingFile(null)} className="btn-ghost flex-1 justify-center">
                {t('cancel')}
              </button>
              <button onClick={handleSaveEdit} className="btn-primary flex-1 justify-center">
                {t('save')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AddSubjectModal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} />
    </div>
  )
}
