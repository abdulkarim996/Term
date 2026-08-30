// @ts-nocheck
import { useDataStore } from '../../store/dataStore'
import { cloudDeleteDriveFile, cloudUpdateDriveFile, cloudAddDriveFile } from '../../lib/firestore'
import React, { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import {
  FolderOpen, Upload, ExternalLink, File, FileText,
  Image, Film, Search, Plus, Folder, ChevronRight,
  RefreshCw, Loader2, Link, Pencil
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
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
  }

  const { googleAccessToken, setGoogleTokens, googleClientId } = useSettingsStore()
  const { showToast } = useUIStore()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)

  const subjects = useDataStore(state => state.subjects)
  const driveFiles = useDataStore(state => state.driveFiles)

  const filteredFiles = (driveFiles ?? []).filter((f) => {
    const matchSub = selectedSubject === null || String(f.subjectId) === selectedSubject
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  })

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [String(s.id), s]))

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

  return (
    <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t('storage')}</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {driveFiles?.length ?? 0} {t('filesFromDrive')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSubject(true)}
            className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
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
              {t('sync')}
            </button>
          ) : (
            <button onClick={handleConnectDrive} className="btn-primary">
              <Link size={14} />
              {t('linkDrive')}
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

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="input-field text-sm pr-9"
          placeholder={t('searchFile')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Subject filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
        <button
          onClick={() => setSelectedSubject(null)}
          className={`chip flex-shrink-0 ${selectedSubject === null ? 'active' : ''}`}
        >
          {t('allSubjects')}
        </button>
        {subjects?.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(String(s.id) === selectedSubject ? null : String(s.id))}
            className={`chip flex-shrink-0 ${selectedSubject === String(s.id) ? 'active' : ''}`}
            style={selectedSubject === String(s.id) ? { borderColor: s.color, color: s.color, backgroundColor: `${s.color}15` } : {}}
          >
            <span className="subject-color-dot" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <FolderOpen size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted text-sm">
            {isConnected ? t('noFilesFound') : t('linkGoogleDrive')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const groupedSafe: Record<string, Record<string, DriveFile[]>> = {};
            
            filteredFiles.forEach(file => {
              let subKey = file.subjectId ? String(file.subjectId) : 'uncategorized';
              if (subKey !== 'uncategorized' && !subjectMap[subKey]) {
                subKey = 'uncategorized';
              }
              const catKey = file.category || 'uncategorized';
              
              if (!groupedSafe[subKey]) groupedSafe[subKey] = {};
              if (!groupedSafe[subKey][catKey]) groupedSafe[subKey][catKey] = [];
              groupedSafe[subKey][catKey].push(file);
            });

            const subjectKeys = Object.keys(groupedSafe).filter(k => k !== 'uncategorized');
            
            const renderGroup = (subKey: string) => {
              const sub = subKey !== 'uncategorized' ? subjectMap[subKey] : null;
              const categories = groupedSafe[subKey];
              
              return (
                <div key={subKey} className="space-y-4 mb-8">
                  <div className="flex items-center gap-2 mb-2 border-b border-surface-border/50 pb-2">
                    {sub ? (
                      <>
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: sub.color }} />
                        <h3 className="text-base font-bold" style={{ color: sub.color }}>{sub.name}</h3>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center">
                          <Folder size={16} className="text-text-muted" />
                        </div>
                        <h3 className="text-base font-bold text-text-muted">{t('uncategorized')}</h3>
                      </>
                    )}
                  </div>

                  {Object.entries(categories).map(([catKey, files]) => (
                    <div key={catKey} className="pl-3 space-y-2 relative before:content-[''] before:absolute before:right-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border/50 before:rounded-full">
                      <h4 className="text-xs font-bold text-text-secondary mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-text-muted/60" />
  {catKey === 'uncategorized' ? t('uncategorized') : (CATEGORIES.find(c => c.id === catKey) ? t(CATEGORIES.find(c => c.id === catKey)!.name) : catKey)}

                        <span className="text-[10px] text-text-muted font-normal bg-surface-elevated px-1.5 py-0.5 rounded-md">
                          {files.length}
                        </span>
                      </h4>
                      
                      <div className="space-y-2">
                        {files.map(file => (
                          <div key={file.id} className="glass-card p-3 flex items-center justify-between hover:bg-surface-hover transition-all">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="flex-shrink-0 p-2 bg-surface-elevated rounded-lg shadow-sm border border-surface-border/50">
                                {getFileIcon(file.mimeType)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-text-primary truncate font-medium">{file.name}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] text-text-muted">{formatSizeSafe(file.size)}</span>
                                  <span className="text-[10px] text-text-muted">{formatDateSafe(file.modifiedTime)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => openEditModal(file)}
                                className="p-2 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-all bg-surface-elevated border border-surface-border shadow-sm"
                              >
                                <Pencil size={14} />
                              </button>
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-all bg-surface-elevated border border-surface-border shadow-sm"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            };

            return (
              <>
                {subjectKeys.map(renderGroup)}
                {groupedSafe['uncategorized'] && renderGroup('uncategorized')}
              </>
            );
          })()}
        </div>
      )}

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

            {editCat === t('other') && (
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
