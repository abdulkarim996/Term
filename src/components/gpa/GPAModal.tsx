// @ts-nocheck
import React, { useState, useMemo } from 'react'
import {
  X, Award, TrendingUp, Calculator, Settings, Plus,
  Trash2, ChevronDown, ChevronUp, Sparkles, BookOpen,
  CheckCircle2, ArrowUpRight, ArrowDownRight, RefreshCw,
  HelpCircle, GraduationCap, BarChart2
} from 'lucide-react'
import { useUIStore, useSettingsStore } from '../../store'
import { useDataStore, SemesterRecord, CourseGrade } from '../../store/dataStore'
import {
  cloudAddSemester, cloudUpdateSemester, cloudDeleteSemester
} from '../../lib/firestore'
import {
  GRADE_OPTIONS, getGradePoint, calculateAcademicSummary
} from '../../lib/gpa'
import { useTranslation } from '../../hooks/useTranslation'

export default function GPAModal() {
  const { showGpaModal, setShowGpaModal, showToast } = useUIStore()
  const {
    gpaScale, setGpaScale,
    targetGraduationHours, setTargetGraduationHours,
    baselineGpa, setBaselineGpa,
    baselineHours, setBaselineHours,
  } = useSettingsStore()

  const { t, language } = useTranslation()
  const semesters = useDataStore(state => state.semesters)
  const subjects = useDataStore(state => state.subjects)

  const [activeTab, setActiveTab] = useState<'tracker' | 'calculator' | 'settings'>('tracker')
  const [expandedSemesterId, setExpandedSemesterId] = useState<string | number | null>(null)

  // Add Semester state
  const [showAddSemesterForm, setShowAddSemesterForm] = useState(false)
  const [newSemesterName, setNewSemesterName] = useState('')

  // Add Course inside semester state
  const [addingCourseForSemId, setAddingCourseForSemId] = useState<string | number | null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseHours, setNewCourseHours] = useState(3)
  const [newCourseGrade, setNewCourseGrade] = useState('A+')

  // Calculator (Simulation) state
  const [simulatedCourses, setSimulatedCourses] = useState<CourseGrade[]>([
    { id: 'sim_1', name: 'مادة 1', creditHours: 3, grade: 'A+' },
    { id: 'sim_2', name: 'مادة 2', creditHours: 3, grade: 'A' },
  ])
  const [targetGpaInput, setTargetGpaInput] = useState('')

  // Overall Academic Summary
  const summary = useMemo(() => {
    return calculateAcademicSummary(semesters, gpaScale, targetGraduationHours, baselineGpa, baselineHours)
  }, [semesters, gpaScale, targetGraduationHours, baselineGpa, baselineHours])

  if (!showGpaModal) return null

  // --- Handlers for Semesters ---
  const handleCreateSemester = async () => {
    if (!newSemesterName.trim()) {
      showToast('يرجى كتابة اسم الفصل الدراسي', 'error')
      return
    }
    const newSem: Omit<SemesterRecord, 'id'> = {
      name: newSemesterName.trim(),
      courses: [],
      createdAt: Date.now()
    }
    try {
      const id = await cloudAddSemester(newSem)
      setNewSemesterName('')
      setShowAddSemesterForm(false)
      setExpandedSemesterId(id)
      showToast('تمت إضافة الفصل بنجاح ✨', 'success')
    } catch (err: any) {
      showToast('حدث خطأ أثناء الحفظ', 'error')
    }
  }

  const handleDeleteSemester = async (semId: string | number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفصل الدراسي وجميع مواده؟')) return
    try {
      await cloudDeleteSemester(String(semId))
      showToast('تم حذف الفصل بنجاح', 'info')
    } catch (err) {
      showToast('تعذر الحذف', 'error')
    }
  }

  const handleAddCourseToSemester = async (sem: SemesterRecord) => {
    if (!newCourseName.trim()) {
      showToast('يرجى كتابة اسم المادة', 'error')
      return
    }
    const newCourse: CourseGrade = {
      id: 'c_' + Date.now(),
      name: newCourseName.trim(),
      creditHours: Number(newCourseHours) || 3,
      grade: newCourseGrade
    }
    const updatedCourses = [...(sem.courses || []), newCourse]
    try {
      await cloudUpdateSemester(String(sem.id), { courses: updatedCourses })
      setNewCourseName('')
      setNewCourseHours(3)
      setNewCourseGrade('A+')
      setAddingCourseForSemId(null)
      showToast('تمت إضافة المادة بنجاح', 'success')
    } catch (err) {
      showToast('تعذر حفظ المادة', 'error')
    }
  }

  const handleDeleteCourseFromSemester = async (sem: SemesterRecord, courseId: string) => {
    const updatedCourses = (sem.courses || []).filter(c => c.id !== courseId)
    try {
      await cloudUpdateSemester(String(sem.id), { courses: updatedCourses })
      showToast('تم حذف المادة', 'info')
    } catch (err) {
      showToast('تعذر حذف المادة', 'error')
    }
  }

  const handleUpdateCourseGrade = async (sem: SemesterRecord, courseId: string, newGrade: string) => {
    const updatedCourses = (sem.courses || []).map(c => c.id === courseId ? { ...c, grade: newGrade } : c)
    try {
      await cloudUpdateSemester(String(sem.id), { courses: updatedCourses })
    } catch (err) {
      showToast('تعذر تعديل الدرجة', 'error')
    }
  }

  // --- Calculator Simulator Helpers ---
  const handleImportCurrentSubjects = () => {
    if (!subjects || subjects.length === 0) {
      showToast('لا توجد مواد مسجلة حالياً في جدولك لاستيرادها', 'info')
      return
    }
    const imported: CourseGrade[] = subjects.map((sub, idx) => ({
      id: 'sim_' + (sub.id || idx),
      name: sub.name,
      code: sub.code || '',
      creditHours: sub.creditHours || 3,
      grade: 'A+'
    }))
    setSimulatedCourses(imported)
    showToast(`تم استيراد ${imported.length} مواد من جدولك الحالي! 🚀`, 'success')
  }

  const handleAddSimulatedCourse = () => {
    setSimulatedCourses(prev => [
      ...prev,
      { id: 'sim_' + Date.now(), name: `مادة ${prev.length + 1}`, creditHours: 3, grade: 'A+' }
    ])
  }

  const handleRemoveSimulatedCourse = (id: string) => {
    setSimulatedCourses(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdateSimCourse = (id: string, field: 'name' | 'creditHours' | 'grade', value: any) => {
    setSimulatedCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  // Calculate simulated numbers
  const simStats = useMemo(() => {
    let termH = 0
    let termP = 0
    simulatedCourses.forEach(c => {
      const h = Number(c.creditHours) || 0
      const pts = getGradePoint(c.grade, gpaScale)
      termH += h
      termP += h * pts
    })
    const simTermGpa = termH > 0 ? Number((termP / termH).toFixed(2)) : 0

    // New projected cumulative GPA
    const prevHours = summary.totalCompletedHours
    const prevPoints = summary.totalPoints
    const newTotalHours = prevHours + termH
    const newTotalPoints = prevPoints + termP
    const projectedCumGpa = newTotalHours > 0 ? Number((newTotalPoints / newTotalHours).toFixed(2)) : simTermGpa
    const diff = Number((projectedCumGpa - summary.cumulativeGpa).toFixed(2))

    return {
      termHours: termH,
      termGpa: simTermGpa,
      projectedCumGpa,
      diff
    }
  }, [simulatedCourses, gpaScale, summary])

  // Save simulated courses as a semester
  const handleSaveSimulationAsSemester = async () => {
    if (simulatedCourses.length === 0) return
    const semName = prompt('أدخل اسم الفصل الدراسي لحفظ هذه المواد:', 'الفصل الحالي')
    if (!semName) return

    const newSem: Omit<SemesterRecord, 'id'> = {
      name: semName.trim(),
      courses: simulatedCourses.map(c => ({
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        name: c.name,
        creditHours: Number(c.creditHours) || 3,
        grade: c.grade
      })),
      createdAt: Date.now()
    }
    try {
      await cloudAddSemester(newSem)
      showToast('تم اعتماد وحفظ الفصل في سجلك الأكاديمي! 🎓', 'success')
      setActiveTab('tracker')
    } catch (err) {
      showToast('تعذر الحفظ', 'error')
    }
  }

  // --- Render SVG Trend Chart ---
  const renderTrendChart = () => {
    const points = summary.termGpas
    if (!points || points.length === 0) {
      return (
        <div className="py-8 text-center text-text-muted text-xs bg-surface-elevated/40 rounded-2xl border border-surface-border/50">
          <TrendingUp size={28} className="mx-auto mb-2 text-text-muted/40" />
          <p>لا توجد فصول دراسية كافية لرسم المنحنى البياني بعد.</p>
          <p className="text-[11px] text-text-muted/60 mt-1">أضف فصولك وموادك في الأسفل وسيظهر مسار تطور معدلك تلقائياً 📈</p>
        </div>
      )
    }

    const maxGpa = gpaScale === 5 ? 5.0 : 4.0
    const minGpa = gpaScale === 5 ? 2.0 : 1.5

    const svgWidth = 460
    const svgHeight = 160
    const padX = 40
    const padY = 25

    const chartW = svgWidth - padX * 2
    const chartH = svgHeight - padY * 2

    const coords = points.map((p, i) => {
      const x = points.length === 1
        ? svgWidth / 2
        : padX + (i / (points.length - 1)) * chartW
      const clamped = Math.max(minGpa, Math.min(maxGpa, p.termGpa))
      const y = padY + chartH - ((clamped - minGpa) / (maxGpa - minGpa)) * chartH
      return { x, y, ...p }
    })

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
    }, '')

    const areaD = coords.length > 1
      ? `${pathD} L ${coords[coords.length - 1].x} ${padY + chartH} L ${coords[0].x} ${padY + chartH} Z`
      : ''

    return (
      <div className="w-full bg-surface-elevated/50 p-4 rounded-2xl border border-surface-border/60 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-accent-blue" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">مسار تطور المعدل الفصلي</span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">الحد الأقصى: {maxGpa.toFixed(2)}</span>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f8ef7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = padY + chartH * ratio
            return (
              <line
                key={idx}
                x1={padX}
                y1={y}
                x2={svgWidth - padX}
                y2={y}
                stroke="currentColor"
                className="text-surface-border/60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            )
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#gpaGradient)" />}

          {/* Path Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#4f8ef7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Data Points */}
          {coords.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#0d1117"
                stroke="#4f8ef7"
                strokeWidth="2.5"
              />
              <circle cx={pt.x} cy={pt.y} r="2" fill="#fff" />
              {/* Value Label above */}
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="fill-text-primary text-[10px] font-bold font-mono"
              >
                {pt.termGpa.toFixed(2)}
              </text>
              {/* Term Name below */}
              <text
                x={pt.x}
                y={padY + chartH + 16}
                textAnchor="middle"
                className="fill-text-muted text-[9px] font-medium"
              >
                {pt.name.length > 10 ? pt.name.substring(0, 8) + '..' : pt.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface border border-surface-border w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-blue/20 to-accent-purple/20 border border-accent-blue/30 flex items-center justify-center shadow-sm">
              <GraduationCap size={22} className="text-accent-blue" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                السجل الأكاديمي والمعدل (GPA)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-mono">
                  نظام {gpaScale}.0
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">تتبع مسيرتك الأكاديمية ومحاكاة المعدل المستهدف</p>
            </div>
          </div>
          <button
            onClick={() => setShowGpaModal(false)}
            className="w-8 h-8 rounded-xl bg-surface-border/50 hover:bg-surface-border text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center px-4 pt-3 pb-1 border-b border-surface-border/60 bg-surface gap-2">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tracker'
                ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            <BarChart2 size={15} />
            السجل والتتبع الأكاديمي
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'calculator'
                ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            <Calculator size={15} />
            الحاسبة والمحاكي
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all ml-auto ${
              activeTab === 'settings'
                ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            <Settings size={15} />
            الإعدادات
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

          {/* TAB 1: ACADEMIC TRACKER */}
          {activeTab === 'tracker' && (
            <div className="space-y-5 animate-in fade-in duration-200">

              {/* Luxury Hero Card */}
              <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-surface-elevated via-surface-elevated/80 to-accent-blue/5 border border-surface-border shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                      المعدل التراكمي العام (Cumulative GPA)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-text-primary font-mono tracking-tight">
                        {summary.cumulativeGpa.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-text-muted/60 font-mono">
                        / {gpaScale}.00
                      </span>
                    </div>

                    {summary.honorsTitle && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm animate-pulse"
                           style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                        <Award size={14} className="text-amber-400" />
                        <span className="text-amber-300">{summary.honorsTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Graduation Progress Donut */}
                  <div className="flex items-center gap-4 bg-surface/60 border border-white/5 p-3.5 rounded-2xl">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-surface-border"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-accent-blue transition-all duration-1000 ease-out"
                          strokeDasharray={`${summary.progressPercentage}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-text-primary font-mono">
                        {summary.progressPercentage}%
                      </span>
                    </div>

                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-text-muted font-medium">ساعات التخرج</p>
                      <p className="text-sm font-bold text-text-primary font-mono">
                        {summary.totalCompletedHours} <span className="text-xs text-text-muted font-normal">/ {targetGraduationHours} س</span>
                      </p>
                      <p className="text-[10px] text-text-muted/70 mt-0.5">
                        المتبقي: {Math.max(0, targetGraduationHours - summary.totalCompletedHours)} ساعة
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend Chart */}
              {renderTrendChart()}

              {/* Semesters History Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <BookOpen size={16} className="text-accent-purple" />
                    سجل الفصول الدراسية ({semesters.length})
                  </h3>
                  <button
                    onClick={() => setShowAddSemesterForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 transition-colors border border-accent-blue/20"
                  >
                    <Plus size={14} />
                    إضافة فصل دراسي
                  </button>
                </div>

                {/* Add Semester Form Popup */}
                {showAddSemesterForm && (
                  <div className="p-4 rounded-2xl bg-surface-elevated border border-accent-blue/30 space-y-3 animate-in fade-in">
                    <h4 className="text-xs font-bold text-text-primary">إضافة فصل دراسي جديد</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مثلاً: الفصل الأول 1445هـ أو ترم خريف 2024"
                        value={newSemesterName}
                        onChange={e => setNewSemesterName(e.target.value)}
                        className="flex-1 bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue"
                      />
                      <button
                        onClick={handleCreateSemester}
                        className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition-colors"
                      >
                        إضافة
                      </button>
                      <button
                        onClick={() => setShowAddSemesterForm(false)}
                        className="px-3 py-2 bg-surface-border text-text-muted rounded-xl text-xs hover:text-text-primary"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* Semesters List */}
                {semesters.length === 0 ? (
                  <div className="p-8 text-center bg-surface-elevated/30 rounded-2xl border border-surface-border/50 text-text-muted text-xs">
                    لم تقم بإضافة أي فصول دراسية سابقة بعد.
                    <br />
                    اضغط على زر <strong>إضافة فصل دراسي</strong> للبدء بتسجيل موادك ودرجاتك.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...semesters].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(sem => {
                      const isExpanded = expandedSemesterId === sem.id
                      const semCourses = sem.courses || []
                      const semHours = semCourses.reduce((sum, c) => sum + (Number(c.creditHours) || 0), 0)
                      const semPoints = semCourses.reduce((sum, c) => sum + ((Number(c.creditHours) || 0) * getGradePoint(c.grade, gpaScale)), 0)
                      const semGpa = semHours > 0 ? (semPoints / semHours).toFixed(2) : '0.00'

                      return (
                        <div
                          key={sem.id}
                          className="bg-surface-elevated rounded-2xl border border-surface-border/80 overflow-hidden shadow-sm transition-all"
                        >
                          {/* Semester Accordion Header */}
                          <div
                            onClick={() => setExpandedSemesterId(isExpanded ? null : sem.id)}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-hover/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <button className="text-text-muted">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <div>
                                <h4 className="text-sm font-bold text-text-primary">{sem.name}</h4>
                                <span className="text-[11px] text-text-muted font-mono">
                                  {semCourses.length} مواد • {semHours} ساعات معتمدة
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-left rtl:text-right">
                                <span className="text-[10px] text-text-muted block">معدل الفصل</span>
                                <span className="text-sm font-black text-accent-blue font-mono">
                                  {semGpa}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSemester(sem.id)
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 flex items-center justify-center transition-colors"
                                title="حذف الفصل"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Courses Inside Semester */}
                          {isExpanded && (
                            <div className="p-3.5 pt-0 border-t border-surface-border/50 bg-surface/30 space-y-3">
                              {/* Courses list */}
                              {semCourses.length === 0 ? (
                                <p className="text-center py-4 text-xs text-text-muted">لا توجد مواد مضافة في هذا الفصل بعد.</p>
                              ) : (
                                <div className="divide-y divide-surface-border/40">
                                  {semCourses.map(course => (
                                    <div key={course.id} className="py-2.5 flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-text-primary truncate">{course.name}</p>
                                        <p className="text-[10px] text-text-muted font-mono">{course.creditHours} ساعات معتمدة</p>
                                      </div>

                                      {/* Grade Selector */}
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={course.grade}
                                          onChange={(e) => handleUpdateCourseGrade(sem, course.id, e.target.value)}
                                          className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs font-bold text-text-primary outline-none focus:border-accent-blue"
                                        >
                                          {Object.keys(GRADE_OPTIONS).map(gr => (
                                            <option key={gr} value={gr}>{gr} ({getGradePoint(gr, gpaScale)})</option>
                                          ))}
                                        </select>

                                        <button
                                          onClick={() => handleDeleteCourseFromSemester(sem, course.id)}
                                          className="text-text-muted hover:text-red-400 p-1"
                                          title="حذف المادة"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Course Form or Button */}
                              {addingCourseForSemId === sem.id ? (
                                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-2 mt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="اسم المادة (مثلاً: MATH 241)"
                                      value={newCourseName}
                                      onChange={e => setNewCourseName(e.target.value)}
                                      className="bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      max="8"
                                      placeholder="الساعات (3)"
                                      value={newCourseHours}
                                      onChange={e => setNewCourseHours(Number(e.target.value))}
                                      className="bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                                    />
                                    <select
                                      value={newCourseGrade}
                                      onChange={e => setNewCourseGrade(e.target.value)}
                                      className="bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                                    >
                                      {Object.keys(GRADE_OPTIONS).map(gr => (
                                        <option key={gr} value={gr}>{gr}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setAddingCourseForSemId(null)}
                                      className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary"
                                    >
                                      إلغاء
                                    </button>
                                    <button
                                      onClick={() => handleAddCourseToSemester(sem)}
                                      className="px-3 py-1 bg-accent-blue text-white rounded-lg text-xs font-semibold hover:bg-blue-600"
                                    >
                                      حفظ المادة
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingCourseForSemId(sem.id)}
                                  className="w-full py-2 text-xs font-semibold text-accent-blue hover:bg-accent-blue/5 rounded-xl border border-dashed border-accent-blue/30 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <Plus size={14} />
                                  إضافة مادة لهذا الفصل
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CALCULATOR & SIMULATOR */}
          {activeTab === 'calculator' && (
            <div className="space-y-5 animate-in fade-in duration-200">

              {/* Simulation Header & Smart Import */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border border-accent-blue/20">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    <Sparkles size={16} className="text-accent-blue" />
                    محاكي درجات الفصل وتوقع المعدل
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    جرب التقديرات المتوقعة لموادك لمعرفة تأثيرها اللحظي على معدلك التراكمي
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImportCurrentSubjects}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <RefreshCw size={13} />
                    استيراد مواد جدولي الحالي ⚡
                  </button>
                  <button
                    onClick={handleAddSimulatedCourse}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-text-primary text-xs font-semibold hover:bg-surface-hover transition-colors"
                  >
                    <Plus size={13} />
                    مادة إضافية
                  </button>
                </div>
              </div>

              {/* Live Calculation Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-surface-elevated border border-surface-border">
                  <span className="text-[11px] text-text-muted block">معدل الفصل المتوقع</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-text-primary font-mono">
                      {simStats.termGpa.toFixed(2)}
                    </span>
                    <span className="text-xs text-text-muted font-mono">/ {gpaScale}.00</span>
                  </div>
                  <span className="text-[10px] text-text-muted mt-1 block">إجمالي: {simStats.termHours} ساعة</span>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated border border-surface-border">
                  <span className="text-[11px] text-text-muted block">المعدل التراكمي الجديد</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-accent-blue font-mono">
                      {simStats.projectedCumGpa.toFixed(2)}
                    </span>
                    <span className="text-xs text-text-muted font-mono">/ {gpaScale}.00</span>
                  </div>
                  <span className="text-[10px] text-text-muted mt-1 block">الحالي: {summary.cumulativeGpa.toFixed(2)}</span>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated border border-surface-border flex flex-col justify-between">
                  <span className="text-[11px] text-text-muted block">فارق التغيير بالمعدل</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {simStats.diff >= 0 ? (
                      <ArrowUpRight size={20} className="text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={20} className="text-rose-400" />
                    )}
                    <span className={`text-xl font-black font-mono ${simStats.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simStats.diff >= 0 ? `+${simStats.diff.toFixed(2)}` : simStats.diff.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted block">
                    {simStats.diff > 0 ? 'معدلك سيرتفع بإذن الله 📈' : simStats.diff < 0 ? 'انتبه! سينخفض معدلك 📉' : 'معدلك سيبقى ثابتاً'}
                  </span>
                </div>
              </div>

              {/* Simulated Courses Table */}
              <div className="bg-surface-elevated rounded-2xl border border-surface-border overflow-hidden">
                <div className="p-3 bg-surface border-b border-surface-border flex items-center justify-between text-xs font-bold text-text-muted">
                  <span>المادة الدراسية</span>
                  <div className="flex items-center gap-8">
                    <span>الساعات</span>
                    <span>الدرجة المتوقعة</span>
                    <span className="w-5"></span>
                  </div>
                </div>

                <div className="divide-y divide-surface-border/50 p-2 space-y-1">
                  {simulatedCourses.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">
                      لم تتم إضافة مواد للمحاكاة بعد. اضغط على "استيراد مواد جدولي الحالي" أو "مادة إضافية".
                    </div>
                  ) : (
                    simulatedCourses.map((c) => (
                      <div key={c.id} className="p-2 flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={c.name}
                          onChange={e => handleUpdateSimCourse(c.id, 'name', e.target.value)}
                          className="flex-1 bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                          placeholder="اسم المادة"
                        />

                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={c.creditHours}
                            onChange={e => handleUpdateSimCourse(c.id, 'creditHours', Number(e.target.value))}
                            className="w-16 bg-surface border border-surface-border rounded-xl px-2 py-1.5 text-xs text-center text-text-primary outline-none focus:border-accent-blue font-mono"
                          />

                          <select
                            value={c.grade}
                            onChange={e => handleUpdateSimCourse(c.id, 'grade', e.target.value)}
                            className="bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent-blue"
                          >
                            {Object.keys(GRADE_OPTIONS).map(gr => (
                              <option key={gr} value={gr}>{gr} ({getGradePoint(gr, gpaScale)})</option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleRemoveSimulatedCourse(c.id)}
                            className="text-text-muted hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Save simulation button */}
              {simulatedCourses.length > 0 && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSimulationAsSemester}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-xs font-bold hover:opacity-90 shadow-lg shadow-accent-blue/20 transition-all"
                  >
                    <CheckCircle2 size={15} />
                    اعتماد ونقل إلى السجل الأكاديمي 📥
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS & BASELINE */}
          {activeTab === 'settings' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-surface-elevated border border-surface-border space-y-4">
                <h3 className="text-sm font-bold text-text-primary">إعدادات المعدل والسلّم الأكاديمي</h3>

                {/* Scale selection */}
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">نظام حساب المعدل</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setGpaScale(5)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        gpaScale === 5
                          ? 'border-accent-blue bg-accent-blue/15 text-accent-blue shadow-sm'
                          : 'border-surface-border bg-surface text-text-muted hover:text-text-primary'
                      }`}
                    >
                      نظام 5.00
                      <span className="block text-[10px] font-normal text-text-muted mt-0.5">المعتمد في معظم الجامعات السعودية</span>
                    </button>
                    <button
                      onClick={() => setGpaScale(4)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        gpaScale === 4
                          ? 'border-accent-blue bg-accent-blue/15 text-accent-blue shadow-sm'
                          : 'border-surface-border bg-surface text-text-muted hover:text-text-primary'
                      }`}
                    >
                      نظام 4.00
                      <span className="block text-[10px] font-normal text-text-muted mt-0.5">النظام الأمريكي والعالمي</span>
                    </button>
                  </div>
                </div>

                {/* Target Hours */}
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1">
                    إجمالي ساعات الخطة الدراسية للتخرج (Target Hours)
                  </label>
                  <input
                    type="number"
                    value={targetGraduationHours}
                    onChange={e => setTargetGraduationHours(Number(e.target.value) || 134)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                  />
                  <span className="text-[10px] text-text-muted mt-1 block">تستخدم لحساب نسبة إنجازك المتبقية نحو التخرج (مثلاً: 134 ساعة للهندسة الصناعية).</span>
                </div>
              </div>

              {/* Baseline Setup */}
              <div className="p-4 rounded-2xl bg-surface-elevated border border-surface-border space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">أساس المعدل السابق (Baseline)</h3>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    إذا درست فصولاً سابقة قبل استخدامك للتطبيق ولا ترغب في كتابة كل مادة بالتفصيل، يمكنك إدخال معدلك السابق التراكمي وعدد ساعاتك السابقة هنا، وسيقوم النظام باحتسابها تلقائياً مع فصولك الجديدة!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1">المعدل السابق (GPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={gpaScale}
                      value={baselineGpa || ''}
                      onChange={e => setBaselineGpa(Number(e.target.value) || 0)}
                      placeholder="مثال: 4.65"
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1">الساعات السابقة المنجزة</label>
                    <input
                      type="number"
                      min="0"
                      value={baselineHours || ''}
                      onChange={e => setBaselineHours(Number(e.target.value) || 0)}
                      placeholder="مثال: 45"
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
