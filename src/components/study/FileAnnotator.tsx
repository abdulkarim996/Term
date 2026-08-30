import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { PDFDocument, rgb } from 'pdf-lib'
import type {  DriveFile  } from '../../store/dataStore'
import { useSettingsStore, useUIStore } from '../../store'
import { useDataStore } from '../../store/dataStore'
import { X, Save, Trash2, Pen, Eraser, Loader2, Highlighter, Undo, Redo, ZoomIn, ZoomOut, Square, Circle, ArrowUpRight, Type, Image as ImageIcon, MousePointer2 } from 'lucide-react'
import MiniTimer from './MiniTimer'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Props {
  file: DriveFile
  onClose: () => void
}

type Point = { x: number, y: number }
type ToolMode = 'pen' | 'highlighter' | 'eraser' | 'text' | 'rect' | 'circle' | 'arrow' | 'image' | 'select'

type BaseObj = { id: string }
type StrokeObj = BaseObj & { type: 'stroke', points: Point[], color: string, thickness: number, mode: 'pen' | 'highlighter' | 'eraser' }
type TextObj = BaseObj & { type: 'text', x: number, y: number, text: string, color: string, size: number }
type ShapeObj = BaseObj & { type: 'shape', shapeType: 'rect' | 'circle' | 'arrow', start: Point, end: Point, color: string, thickness: number }
type ImageObj = BaseObj & { type: 'image', x: number, y: number, width: number, height: number, dataUrl: string }

type PageObject = StrokeObj | TextObj | ShapeObj | ImageObj

export default function FileAnnotator({ file, onClose }: Props) {
  const { t } = useTranslation();
  const { googleAccessToken } = useSettingsStore()
  const { showToast } = useUIStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState(1)
  
  const [objectsByPage, setObjectsByPage] = useState<Record<number, PageObject[]>>({})
  const [currentStroke, setCurrentStroke] = useState<{ page: number, stroke: StrokeObj } | null>(null)
  const [currentShape, setCurrentShape] = useState<{ page: number, shape: ShapeObj } | null>(null)
  
  const [activeTextInput, setActiveTextInput] = useState<{ page: number, x: number, y: number, text: string } | null>(null)
  
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Selection & dragging state
  const [selectedObjectId, setSelectedObjectId] = useState<{ page: number, id: string } | null>(null)
  const [dragState, setDragState] = useState<{ 
    type: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se', 
    startX: number, startY: number, 
    origX: number, origY: number, 
    origW: number, origH: number 
  } | null>(null)

  const [history, setHistory] = useState<Record<number, PageObject[]>[]>([{}])
  const [historyIndex, setHistoryIndex] = useState(0)

  const [toolMode, setToolMode] = useState<ToolMode>('pen')
  const [color, setColor] = useState('#ff0000')
  const [thickness, setThickness] = useState(3)
  const [textSize, setTextSize] = useState(24)
  
  const canvasRefs = useRef<Record<number, HTMLCanvasElement>>({})
  const imageCache = useRef<Record<string, HTMLImageElement>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  
  const isImage = file.mimeType?.includes('image')

  useEffect(() => {
    fetchFile()
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [])

  const fetchFile = async () => {
    try {
      setLoading(true);
      const mime = file.mimeType || '';
      const isPdf = mime === 'application/pdf';
      const isImage = mime.startsWith('image/');
      const isGoogleDoc = mime === 'application/vnd.google-apps.document';
      const isGoogleSlides = mime === 'application/vnd.google-apps.presentation';
      const isWord = mime.includes('wordprocessingml.document') || mime.includes('msword') || file.name?.match(/\.(docx|doc)$/i);
      const isPpt = mime.includes('presentationml.presentation') || mime.includes('ms-powerpoint') || file.name?.match(/\.(pptx|ppt)$/i);

      let buffer: ArrayBuffer;
      const headers = { Authorization: `Bearer ${googleAccessToken}` };

      if (isGoogleDoc || isGoogleSlides) {
        // Scenario 3: Google Workspace
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}/export?mimeType=application/pdf`, { headers });
        if (!res.ok) throw new Error('Failed to export Google Workspace file');
        buffer = await res.arrayBuffer();

      } else if (isWord || isPpt) {
        // Scenario 4: MS Office Native
        const targetMime = isWord ? 'application/vnd.google-apps.document' : 'application/vnd.google-apps.presentation';
        
        // 1. Copy
        const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}/copy`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mimeType: targetMime })
        });
        if (!copyRes.ok) throw new Error('Failed to copy MS file');
        const copyData = await copyRes.json();
        const tempId = copyData.id;

        try {
          // 2. Export
          const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${tempId}/export?mimeType=application/pdf`, { headers });
          if (!exportRes.ok) throw new Error('Failed to export temp file');
          buffer = await exportRes.arrayBuffer();
        } finally {
          // 3. Cleanup
          await fetch(`https://www.googleapis.com/drive/v3/files/${tempId}`, {
            method: 'DELETE',
            headers
          }).catch(console.error);
        }

      } else {
        // Scenario 1 & 2: PDF, Images, or Unknown
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`, { headers });
        if (!res.ok) throw new Error('Failed to fetch file directly');
        buffer = await res.arrayBuffer();
      }

      setFileBytes(new Uint8Array(buffer));
      const blobType = isImage ? mime : 'application/pdf';
      const url = URL.createObjectURL(new Blob([buffer], { type: blobType }));
      setPdfUrl(url);

    } catch (e) {
      console.error(e);
      showToast(decodeURIComponent('%D8%AE%D8%B7%D8%A3%20%D8%A3%D8%AB%D9%86%D8%A7%D8%A1%20%D8%AC%D9%84%D8%A8%20%D8%A7%D9%84%D9%85%D9%84%D9%81'), 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const pushToHistory = (newObjects: Record<number, PageObject[]>) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newObjects)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setObjectsByPage(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setObjectsByPage(history[historyIndex + 1])
    }
  }

  useEffect(() => {
    drawAll()
  }, [objectsByPage, currentStroke, currentShape, loading, numPages, scale])

  const drawAll = () => {
    const pagesToDraw = isImage ? [1] : Array.from({ length: numPages }, (_, i) => i + 1)
    pagesToDraw.forEach(page => {
      const canvas = canvasRefs.current[page]
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const drawObj = (obj: PageObject) => {
        // Skip drawing if it's the currently selected image being dragged, to render it as an overlay instead?
        // Actually, we can just draw it, and overlay a selection box. 
        // If we want smooth drag without flickering, maybe we shouldn't draw it on the main canvas while dragging.
        // For simplicity, we draw everything on canvas, and for selection, we just draw handles over it.
        
        if (obj.type === 'stroke') {
          if (obj.points.length < 2) return
          ctx.beginPath()
          ctx.moveTo(obj.points[0].x * scale, obj.points[0].y * scale)
          for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x * scale, obj.points[i].y * scale)
          }
          
          if (obj.mode === 'eraser') {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = obj.thickness * scale * 5
            ctx.globalCompositeOperation = 'destination-out'
          } else if (obj.mode === 'highlighter') {
            ctx.strokeStyle = hexToRgba(obj.color, 0.4)
            ctx.lineWidth = obj.thickness * scale * 3
            ctx.globalCompositeOperation = 'multiply'
          } else {
            ctx.strokeStyle = obj.color
            ctx.lineWidth = obj.thickness * scale
            ctx.globalCompositeOperation = 'source-over'
          }
          
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
        } 
        else if (obj.type === 'shape') {
          ctx.strokeStyle = obj.color
          ctx.lineWidth = obj.thickness * scale
          ctx.globalCompositeOperation = 'source-over'
          ctx.beginPath()
          
          const sx = obj.start.x * scale
          const sy = obj.start.y * scale
          const ex = obj.end.x * scale
          const ey = obj.end.y * scale
          
          if (obj.shapeType === 'rect') {
            ctx.rect(sx, sy, ex - sx, ey - sy)
          } else if (obj.shapeType === 'circle') {
            const rx = Math.abs(ex - sx) / 2
            const ry = Math.abs(ey - sy) / 2
            const cx = Math.min(sx, ex) + rx
            const cy = Math.min(sy, ey) + ry
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
          } else if (obj.shapeType === 'arrow') {
            ctx.moveTo(sx, sy)
            ctx.lineTo(ex, ey)
            const angle = Math.atan2(ey - sy, ex - sx)
            const headlen = 15 * scale
            ctx.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6))
            ctx.moveTo(ex, ey)
            ctx.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6))
          }
          ctx.stroke()
        }
        else if (obj.type === 'text') {
          ctx.font = `${obj.size * scale}px Arial`
          ctx.fillStyle = obj.color
          ctx.globalCompositeOperation = 'source-over'
          ctx.textBaseline = 'top'
          const lines = obj.text.split('\n')
          lines.forEach((line, idx) => {
            ctx.fillText(line, obj.x * scale, (obj.y * scale) + (idx * obj.size * scale * 1.2))
          })
        }
        else if (obj.type === 'image') {
          ctx.globalCompositeOperation = 'source-over'
          let img = imageCache.current[obj.id]
          if (!img) {
            img = new window.Image()
            img.src = obj.dataUrl
            imageCache.current[obj.id] = img
            img.onload = () => drawAll()
          }
          if (img.complete) {
            ctx.drawImage(img, obj.x * scale, obj.y * scale, obj.width * scale, obj.height * scale)
          }
        }
      }

      const objects = objectsByPage[page] || []
      
      // Draw all objects EXCEPT the one currently being dragged (so we can render it as a DOM overlay instead to avoid canvas redrawing lag)
      // Actually, updating the state and redrawing canvas is fast enough. Let's just draw everything on canvas.
      objects.forEach(drawObj)
      
      if (currentStroke && currentStroke.page === page) drawObj(currentStroke.stroke)
      if (currentShape && currentShape.page === page) drawObj(currentShape.shape)
      
      // Draw selection overlay if this page has the selected object
      if (selectedObjectId && selectedObjectId.page === page) {
         const selObj = objects.find(o => o.id === selectedObjectId.id)
         if (selObj && selObj.type === 'image') {
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = '#007bff'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            ctx.strokeRect(selObj.x * scale, selObj.y * scale, selObj.width * scale, selObj.height * scale)
            ctx.setLineDash([])
            
            // Draw handles
            ctx.fillStyle = '#007bff'
            const hs = 8 // handle size
            const coords = [
              [selObj.x, selObj.y], // NW
              [selObj.x + selObj.width, selObj.y], // NE
              [selObj.x, selObj.y + selObj.height], // SW
              [selObj.x + selObj.width, selObj.y + selObj.height] // SE
            ]
            coords.forEach(([hx, hy]) => {
               ctx.fillRect((hx * scale) - hs/2, (hy * scale) - hs/2, hs, hs)
            })
         }
      }
      
    })
  }

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)
    return { x: x / scale, y: y / scale }
  }

  const saveActiveText = () => {
    if (!activeTextInput) return
    if (activeTextInput.text.trim()) {
      const newObj: TextObj = {
        id: Date.now().toString(),
        type: 'text',
        x: activeTextInput.x,
        y: activeTextInput.y,
        text: activeTextInput.text,
        color,
        size: textSize
      }
      const newObjects = {
        ...objectsByPage,
        [activeTextInput.page]: [...(objectsByPage[activeTextInput.page] || []), newObj]
      }
      setObjectsByPage(newObjects)
      pushToHistory(newObjects)
    }
    setActiveTextInput(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
       const img = new Image()
       img.onload = () => {
          const maxDim = 800
          let w = img.width
          let h = img.height
          if (w > maxDim || h > maxDim) {
             const ratio = Math.min(maxDim/w, maxDim/h)
             w *= ratio
             h *= ratio
          }
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          ctx?.drawImage(img, 0, 0, w, h)
          setPendingImage(c.toDataURL('image/png'))
          setToolMode('image')
          showToast(t('clickToInsertImage'), 'info')
       }
       img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent, page: number) => {
    e.preventDefault()
    if (activeTextInput) saveActiveText()
    
    const canvas = canvasRefs.current[page]
    if (!canvas) return
    const pos = getPos(e, canvas)
    
    if (toolMode === 'select') {
      const objects = objectsByPage[page] || []
      // Check handles first if something is already selected on this page
      if (selectedObjectId && selectedObjectId.page === page) {
         const selObj = objects.find(o => o.id === selectedObjectId.id)
         if (selObj && selObj.type === 'image') {
            const hs = 15 / scale // hit area for handle
            const isNW = Math.abs(pos.x - selObj.x) < hs && Math.abs(pos.y - selObj.y) < hs
            const isNE = Math.abs(pos.x - (selObj.x + selObj.width)) < hs && Math.abs(pos.y - selObj.y) < hs
            const isSW = Math.abs(pos.x - selObj.x) < hs && Math.abs(pos.y - (selObj.y + selObj.height)) < hs
            const isSE = Math.abs(pos.x - (selObj.x + selObj.width)) < hs && Math.abs(pos.y - (selObj.y + selObj.height)) < hs
            
            if (isNW) { setDragState({ type: 'resize-nw', startX: pos.x, startY: pos.y, origX: selObj.x, origY: selObj.y, origW: selObj.width, origH: selObj.height }); return }
            if (isNE) { setDragState({ type: 'resize-ne', startX: pos.x, startY: pos.y, origX: selObj.x, origY: selObj.y, origW: selObj.width, origH: selObj.height }); return }
            if (isSW) { setDragState({ type: 'resize-sw', startX: pos.x, startY: pos.y, origX: selObj.x, origY: selObj.y, origW: selObj.width, origH: selObj.height }); return }
            if (isSE) { setDragState({ type: 'resize-se', startX: pos.x, startY: pos.y, origX: selObj.x, origY: selObj.y, origW: selObj.width, origH: selObj.height }); return }
         }
      }
      
      // Check for object hits (only images for now)
      // Reverse iterate to click top-most object
      for (let i = objects.length - 1; i >= 0; i--) {
         const obj = objects[i]
         if (obj.type === 'image') {
            if (pos.x >= obj.x && pos.x <= obj.x + obj.width && pos.y >= obj.y && pos.y <= obj.y + obj.height) {
               setSelectedObjectId({ page, id: obj.id })
               setDragState({ type: 'move', startX: pos.x, startY: pos.y, origX: obj.x, origY: obj.y, origW: obj.width, origH: obj.height })
               return
            }
         }
      }
      
      // Clicked outside, deselect
      setSelectedObjectId(null)
      return
    }
    
    setSelectedObjectId(null) // deselect if switching tools
    
    if (toolMode === 'text') {
       setActiveTextInput({ page, x: pos.x, y: pos.y, text: '' })
       return
    }
    
    if (toolMode === 'image') {
       if (pendingImage) {
          const img = new Image()
          img.onload = () => {
             const newId = Date.now().toString()
             const newObj: ImageObj = { id: newId, type: 'image', x: pos.x, y: pos.y, width: img.width, height: img.height, dataUrl: pendingImage }
             const newObjects = {
               ...objectsByPage,
               [page]: [...(objectsByPage[page] || []), newObj]
             }
             setObjectsByPage(newObjects)
             pushToHistory(newObjects)
             setPendingImage(null)
             
             // Automatically switch to select mode and select it so user can move it immediately
             setToolMode('select')
             setSelectedObjectId({ page, id: newId })
          }
          img.src = pendingImage
       } else {
          fileInputRef.current?.click()
       }
       return
    }
    
    if (toolMode === 'rect' || toolMode === 'circle' || toolMode === 'arrow') {
      setCurrentShape({
        page,
        shape: { id: 'temp', type: 'shape', shapeType: toolMode, start: pos, end: pos, color, thickness }
      })
      return
    }

    setCurrentStroke({ page, stroke: { id: 'temp', type: 'stroke', points: [pos], color, thickness, mode: toolMode } })
  }

  const moveDraw = (e: React.MouseEvent | React.TouchEvent, page: number) => {
    if (toolMode === 'text' || toolMode === 'image') return
    e.preventDefault()
    
    const canvas = canvasRefs.current[page]
    if (!canvas) return
    const pos = getPos(e, canvas)

    if (toolMode === 'select' && selectedObjectId && selectedObjectId.page === page && dragState) {
       const objects = [...(objectsByPage[page] || [])]
       const objIndex = objects.findIndex(o => o.id === selectedObjectId.id)
       if (objIndex === -1) return
       
       const obj = { ...objects[objIndex] } as ImageObj
       const dx = pos.x - dragState.startX
       const dy = pos.y - dragState.startY
       
       if (dragState.type === 'move') {
          obj.x = dragState.origX + dx
          obj.y = dragState.origY + dy
       } else if (dragState.type === 'resize-se') {
          obj.width = Math.max(10, dragState.origW + dx)
          obj.height = Math.max(10, dragState.origH + dy)
       } else if (dragState.type === 'resize-nw') {
          const w = Math.max(10, dragState.origW - dx)
          const h = Math.max(10, dragState.origH - dy)
          obj.x = dragState.origX + (dragState.origW - w)
          obj.y = dragState.origY + (dragState.origH - h)
          obj.width = w
          obj.height = h
       } else if (dragState.type === 'resize-ne') {
          const w = Math.max(10, dragState.origW + dx)
          const h = Math.max(10, dragState.origH - dy)
          obj.y = dragState.origY + (dragState.origH - h)
          obj.width = w
          obj.height = h
       } else if (dragState.type === 'resize-sw') {
          const w = Math.max(10, dragState.origW - dx)
          const h = Math.max(10, dragState.origH + dy)
          obj.x = dragState.origX + (dragState.origW - w)
          obj.width = w
          obj.height = h
       }
       
       objects[objIndex] = obj
       setObjectsByPage({ ...objectsByPage, [page]: objects })
       // Don't push to history here, it would create 1000s of history states. Push on endDraw.
       return
    }

    if (currentShape && currentShape.page === page) {
      setCurrentShape({ ...currentShape, shape: { ...currentShape.shape, end: pos } })
      return
    }

    if (!currentStroke || currentStroke.page !== page) return
    setCurrentStroke({
      page,
      stroke: {
        ...currentStroke.stroke,
        points: [...currentStroke.stroke.points, pos]
      }
    })
  }

  const endDraw = () => {
    if (dragState) {
       // Drag ended, push final position to history
       pushToHistory(objectsByPage)
       setDragState(null)
       return
    }
    
    if (currentStroke) {
      const newObjects = {
        ...objectsByPage,
        [currentStroke.page]: [...(objectsByPage[currentStroke.page] || []), { ...currentStroke.stroke, id: Date.now().toString() }]
      }
      setObjectsByPage(newObjects)
      pushToHistory(newObjects)
      setCurrentStroke(null)
    }
    if (currentShape) {
      const newObjects = {
        ...objectsByPage,
        [currentShape.page]: [...(objectsByPage[currentShape.page] || []), { ...currentShape.shape, id: Date.now().toString() }]
      }
      setObjectsByPage(newObjects)
      pushToHistory(newObjects)
      setCurrentShape(null)
    }
  }

  const createTextImage = async (text: string, colorStr: string, size: number) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    const dpr = 2 
    const lines = text.split('\n')
    ctx.font = `${size * dpr}px Arial`
    
    let maxWidth = 0
    for (const line of lines) {
      const metrics = ctx.measureText(line)
      if (metrics.width > maxWidth) maxWidth = metrics.width
    }
    
    canvas.width = maxWidth + (10 * dpr)
    canvas.height = (lines.length * size * dpr * 1.5) + (10 * dpr)
    
    ctx.font = `${size * dpr}px Arial`
    ctx.fillStyle = colorStr
    ctx.textBaseline = 'top'
    
    lines.forEach((line, idx) => {
      ctx.fillText(line, 0, idx * size * dpr * 1.2)
    })
    
    return canvas.toDataURL('image/png')
  }

  const saveFile = async (overwrite: boolean) => {
    if (!fileBytes) return
    if (activeTextInput) saveActiveText()
    setSelectedObjectId(null)
    
    setSaving(true)
    try {
      let finalBytes: Uint8Array;
      
      if (isImage) {
        showToast('هذا الملف غير مدعوم، يجب أن يكون PDF', 'info')
        setSaving(false)
        return
      } else {
        const pdfDoc = await PDFDocument.load(fileBytes)
        const pages = pdfDoc.getPages()
        
        for (const [pageNumStr, objects] of Object.entries(objectsByPage)) {
          const pNum = parseInt(pageNumStr)
          if (pNum < 1 || pNum > pages.length || objects.length === 0) continue
          
          const page = pages[pNum - 1]
          const { width, height } = page.getSize()
          
          const canvas = canvasRefs.current[pNum]
          if (!canvas) continue
          
          const origCanvasWidth = canvas.width / scale
          const origCanvasHeight = canvas.height / scale
          
          const scaleX = width / origCanvasWidth
          const scaleY = height / origCanvasHeight
          
          for (const obj of objects) {
            if (obj.type === 'stroke') {
              if (obj.mode === 'eraser') continue 
              if (obj.points.length < 2) continue
              
              const thicknessMultiplier = obj.mode === 'highlighter' ? 3 : 1
              const opacity = obj.mode === 'highlighter' ? 0.4 : 1.0
              
              for (let i = 0; i < obj.points.length - 1; i++) {
                const p1 = obj.points[i]
                const p2 = obj.points[i + 1]
                
                page.drawLine({
                  start: { x: p1.x * scaleX, y: height - (p1.y * scaleY) },
                  end: { x: p2.x * scaleX, y: height - (p2.y * scaleY) },
                  thickness: obj.thickness * thicknessMultiplier * scaleX,
                  color: hexToRgb(obj.color),
                  opacity
                })
              }
            }
            else if (obj.type === 'shape') {
              const sx = obj.start.x * scaleX
              const sy = height - (obj.start.y * scaleY)
              const ex = obj.end.x * scaleX
              const ey = height - (obj.end.y * scaleY)
              const borderCol = hexToRgb(obj.color)
              const thick = obj.thickness * scaleX
              
              if (obj.shapeType === 'rect') {
                page.drawRectangle({
                  x: Math.min(sx, ex),
                  y: Math.min(sy, ey),
                  width: Math.abs(ex - sx),
                  height: Math.abs(ey - sy),
                  borderColor: borderCol,
                  borderWidth: thick
                })
              } else if (obj.shapeType === 'circle') {
                page.drawEllipse({
                  x: Math.min(sx, ex) + Math.abs(ex - sx) / 2,
                  y: Math.min(sy, ey) + Math.abs(ey - sy) / 2,
                  xScale: Math.abs(ex - sx) / 2,
                  yScale: Math.abs(ey - sy) / 2,
                  borderColor: borderCol,
                  borderWidth: thick
                })
              } else if (obj.shapeType === 'arrow') {
                page.drawLine({ start: { x: sx, y: sy }, end: { x: ex, y: ey }, color: borderCol, thickness: thick })
                const angle = Math.atan2(ey - sy, ex - sx)
                const headlen = 15 * scaleX
                page.drawLine({
                  start: { x: ex, y: ey },
                  end: { x: ex - headlen * Math.cos(angle - Math.PI / 6), y: ey - headlen * Math.sin(angle - Math.PI / 6) },
                  color: borderCol, thickness: thick
                })
                page.drawLine({
                  start: { x: ex, y: ey },
                  end: { x: ex - headlen * Math.cos(angle + Math.PI / 6), y: ey - headlen * Math.sin(angle + Math.PI / 6) },
                  color: borderCol, thickness: thick
                })
              }
            }
            else if (obj.type === 'text') {
              const dataUrl = await createTextImage(obj.text, obj.color, obj.size)
              if (dataUrl) {
                const pngImage = await pdfDoc.embedPng(dataUrl)
                const { width: imgW, height: imgH } = pngImage.scale(1 / 2)
                page.drawImage(pngImage, {
                  x: obj.x * scaleX,
                  y: height - (obj.y * scaleY) - (imgH * scaleY),
                  width: imgW * scaleX,
                  height: imgH * scaleY
                })
              }
            }
            else if (obj.type === 'image') {
              let embeddedImage;
              if (obj.dataUrl.startsWith('data:image/png')) {
                embeddedImage = await pdfDoc.embedPng(obj.dataUrl)
              } else if (obj.dataUrl.startsWith('data:image/jpeg') || obj.dataUrl.startsWith('data:image/jpg')) {
                embeddedImage = await pdfDoc.embedJpg(obj.dataUrl)
              }
              if (embeddedImage) {
                page.drawImage(embeddedImage, {
                  x: obj.x * scaleX,
                  y: height - (obj.y * scaleY) - (obj.height * scaleY),
                  width: obj.width * scaleX,
                  height: obj.height * scaleY
                })
              }
            }
          }
        }
        finalBytes = await pdfDoc.save()
      }

      const mime = file.mimeType || '';
        const isConverted = mime.includes('wordprocessingml') || mime.includes('presentationml') || mime.includes('google-apps');
        const targetMime = isConverted ? 'application/pdf' : file.mimeType;
        
        let targetName = file.name;
        if (isConverted && !targetName.toLowerCase().endsWith('.pdf')) {
          targetName = targetName.replace(/\.[^/.]+$/, "") + ".pdf";
        }

        const metadata: any = {
          name: overwrite ? targetName : decodeURIComponent('%28%D9%85%D8%B9%D8%AF%D9%84%29%20') + targetName,
          mimeType: targetMime
        }
        
        let headers: Record<string, string> = {
          Authorization: `Bearer ${googleAccessToken}`
        }
  
        if (!overwrite) {
          try {
            const origRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}?fields=parents`, { headers })
            if (origRes.ok) {
              const origData = await origRes.json()
              if (origData.parents && origData.parents.length > 0) {
                metadata.parents = origData.parents
              }
            }
          } catch (err) {
            console.error("Could not fetch original parents", err)
          }
        }
        
        let url = ''
        let method = ''
        let body: any = null
  
        if (overwrite) {
          url = `https://www.googleapis.com/upload/drive/v3/files/${file.driveFileId}?uploadType=media`
          method = 'PATCH'
          headers['Content-Type'] = targetMime
          body = finalBytes
        } else {
          const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata)
          })
          const metaData = await metaRes.json()
          
          url = `https://www.googleapis.com/upload/drive/v3/files/${metaData.id}?uploadType=media`
          method = 'PATCH'
          headers['Content-Type'] = targetMime
          body = finalBytes
        }

      const uploadRes = await fetch(url, { method, headers, body })

      if (!uploadRes.ok) throw new Error('Upload failed')
      
      showToast('تم الحفظ في Google Drive بنجاح! 🎉', 'success')
      onClose()

    } catch (e) {
      console.error(e)
      showToast(t('saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return rgb(r, g, b)
  }

  const clearAllPages = () => {
    if (window.confirm(t('confirmClearEdits'))) {
      setObjectsByPage({})
      pushToHistory({})
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-surface-elevated p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
          <p className="text-text-secondary font-medium">{t('loadingFileFrom')} Drive...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 gap-4 w-full min-h-16 bg-surface-elevated border-b border-surface-border overflow-x-auto hide-scrollbar">
        
        {/* Left Section: Save */}
        <div className="flex items-center gap-2 justify-start shrink-0 min-w-[200px] w-1/4">
          {saving ? (
             <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-accent-blue text-white rounded-xl opacity-70">
               <Loader2 size={18} className="animate-spin" /> <span className="hidden md:inline">جاري الحفظ...</span>
             </div>
          ) : (
            <>
              <button onClick={() => saveFile(false)} className="px-3 py-1.5 md:px-4 md:py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0">{t('saveAsCopy')}</button>
              <button onClick={() => saveFile(true)} className="px-3 py-1.5 md:px-4 md:py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-xl text-xs md:text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0">
                <Save size={16} /> <span className="hidden lg:inline">{t('saveChanges')}</span>
              </button>
            </>
          )}
        </div>

        {/* Center Section: Tools */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl shadow-sm border border-surface-border/50 justify-center shrink-0 mx-auto">
          <button onClick={undo} disabled={historyIndex === 0} className="p-2 rounded-lg text-text-muted hover:bg-surface-hover disabled:opacity-30 shrink-0" title="تحديد (نقر مزدوج لحذف)">
            <Undo size={18} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 rounded-lg text-text-muted hover:bg-surface-hover disabled:opacity-30 shrink-0" title={t('tool')}>
            <Redo size={18} />
          </button>
          
          <div className="w-px h-6 bg-surface-border mx-1 shrink-0" />
          
          <button onClick={() => setToolMode('select')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'select' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title="تحديد (نقر مزدوج لحذف)">
            <MousePointer2 size={18} />
          </button>
          
          <div className="w-px h-6 bg-surface-border mx-1 shrink-0" />
          
          <input type="color" value={color} onChange={e => { setColor(e.target.value); if(toolMode==='eraser'||toolMode==='select') setToolMode('pen') }} className="w-8 h-8 rounded cursor-pointer shrink-0" />
          
          <button onClick={() => setToolMode('pen')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'pen' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Pen size={18} />
          </button>
          <button onClick={() => setToolMode('highlighter')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'highlighter' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Highlighter size={18} />
          </button>
          <button onClick={() => setToolMode('eraser')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'eraser' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Eraser size={18} />
          </button>
          
          <div className="w-px h-6 bg-surface-border mx-1 shrink-0" />
          
          <button onClick={() => setToolMode('text')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'text' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Type size={18} />
          </button>
          <button onClick={() => setToolMode('rect')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'rect' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Square size={18} />
          </button>
          <button onClick={() => setToolMode('circle')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'circle' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <Circle size={18} />
          </button>
          <button onClick={() => setToolMode('arrow')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'arrow' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <ArrowUpRight size={18} />
          </button>
          <button onClick={() => setToolMode('image')} className={`p-2 rounded-lg shrink-0 ${toolMode === 'image' || pendingImage ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-hover'}`} title={t('tool')}>
            <ImageIcon size={18} />
          </button>

          <div className="w-px h-6 bg-surface-border mx-1 shrink-0" />
          
          <div className="flex flex-col items-center gap-1 mx-2 shrink-0">
            <span className="text-[10px] text-text-muted">{t('thickness')} / {t('size')}</span>
            <input type="range" min="1" max="40" value={toolMode==='text' ? textSize : thickness} onChange={e => { if(toolMode==='text') setTextSize(parseInt(e.target.value)); else setThickness(parseInt(e.target.value)) }} className="w-16 md:w-24 accent-accent-blue h-2" />
          </div>

          <div className="w-px h-6 bg-surface-border mx-1 shrink-0" />
          
          <button onClick={clearAllPages} className="p-2 rounded-lg text-text-muted hover:text-accent-red hover:bg-surface-hover shrink-0" title={t('tool')}>
            <Trash2 size={18} />
          </button>
        </div>

        {/* Right Section: Timer, Zoom, Close */}
        <div className="flex items-center gap-2 justify-end shrink-0 min-w-[200px] w-1/4">
          
          {/* Mini Timer */}
          <MiniTimer />

          <div className="flex items-center bg-surface p-1 rounded-xl mx-2 hidden md:flex border border-surface-border">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 text-text-muted hover:bg-surface-hover rounded" title={t('zoomOut')}><ZoomOut size={16} /></button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 text-text-muted hover:bg-surface-hover rounded" title={t('zoomIn')}><ZoomIn size={16} /></button>
          </div>
          
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted transition-colors border border-surface-border">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-surface relative flex justify-center py-8" ref={containerRef}>
        {!fileBytes ? null : isImage ? (
           <div className="relative shadow-xl" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
             <img src={URL.createObjectURL(new Blob([fileBytes]))} alt="file" className="max-w-full" onLoad={(e) => {
               const canvas = canvasRefs.current[1]
               if (canvas) {
                 canvas.width = e.currentTarget.width
                 canvas.height = e.currentTarget.height
                 drawAll()
               }
             }} />
             <canvas
                ref={(el) => { if (el) canvasRefs.current[1] = el }}
                className={`absolute inset-0 touch-none ${toolMode==='text'||toolMode==='image' ? 'cursor-pointer' : (toolMode==='select' ? 'cursor-default' : 'cursor-crosshair')} w-full h-full z-10`}
                onMouseDown={e => startDraw(e, 1)} onMouseMove={e => moveDraw(e, 1)} onMouseUp={endDraw} onMouseOut={endDraw}
                onTouchStart={e => startDraw(e, 1)} onTouchMove={e => moveDraw(e, 1)} onTouchEnd={endDraw}
             />
             {activeTextInput && activeTextInput.page === 1 && (
               <textarea
                 autoFocus
                 style={{
                   position: 'absolute',
                   top: `${activeTextInput.y * scale}px`,
                   left: `${activeTextInput.x * scale}px`,
                   fontSize: `${textSize * scale}px`,
                   color: color,
                   background: 'transparent',
                   border: '2px dashed #007bff',
                   outline: 'none',
                   resize: 'none',
                   lineHeight: 1.2,
                   minWidth: '150px',
                   minHeight: `${textSize * scale * 1.5}px`,
                   zIndex: 100,
                   overflow: 'hidden'
                 }}
                 value={activeTextInput.text}
                 onChange={e => {
                   e.target.style.height = 'auto';
                   e.target.style.height = e.target.scrollHeight + 'px';
                   setActiveTextInput({...activeTextInput, text: e.target.value})
                 }}
                 onBlur={saveActiveText}
               />
             )}
           </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error) => {
              console.error('Error loading PDF:', error)
              showToast('خطأ PDF: ' + (error.message || error), 'error')
            }}
            className="flex flex-col items-center w-full"
            loading={<Loader2 size={32} className="animate-spin text-accent-blue" />}
          >
            <div className="flex flex-col gap-6 w-full max-w-5xl px-4 mx-auto items-center">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                <div key={pageNum} className="relative shadow-xl bg-white mx-auto" style={{ width: 'fit-content' }}>
                  <Page 
                    pageNumber={pageNum} 
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={(page) => {
                      const canvas = canvasRefs.current[pageNum]
                      if (canvas) {
                        const viewport = page.getViewport({ scale })
                        canvas.width = viewport.width
                        canvas.height = viewport.height
                        drawAll()
                      }
                    }}
                  />
                  <canvas
                    ref={(el) => { if (el) canvasRefs.current[pageNum] = el }}
                    className={`absolute inset-0 touch-none ${toolMode==='text'||toolMode==='image' ? 'cursor-pointer' : (toolMode==='select' ? 'cursor-default' : 'cursor-crosshair')} w-full h-full z-10`}
                    onMouseDown={e => startDraw(e, pageNum)} onMouseMove={e => moveDraw(e, pageNum)} onMouseUp={endDraw} onMouseOut={endDraw}
                    onTouchStart={e => startDraw(e, pageNum)} onTouchMove={e => moveDraw(e, pageNum)} onTouchEnd={endDraw}
                  />
                  {activeTextInput && activeTextInput.page === pageNum && (
                     <textarea
                       autoFocus
                       style={{
                         position: 'absolute',
                         top: `${activeTextInput.y * scale}px`,
                         left: `${activeTextInput.x * scale}px`,
                         fontSize: `${textSize * scale}px`,
                         color: color,
                         background: 'transparent',
                         border: '2px dashed #007bff',
                         outline: 'none',
                         resize: 'none',
                         lineHeight: 1.2,
                         minWidth: '150px',
                         minHeight: `${textSize * scale * 1.5}px`,
                         zIndex: 100,
                         overflow: 'hidden'
                       }}
                       value={activeTextInput.text}
                       onChange={e => {
                         e.target.style.height = 'auto';
                         e.target.style.height = e.target.scrollHeight + 'px';
                         setActiveTextInput({...activeTextInput, text: e.target.value})
                       }}
                       onBlur={saveActiveText}
                     />
                   )}
                </div>
              ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}
