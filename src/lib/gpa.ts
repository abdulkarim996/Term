// GPA Calculation & Academic Utilities

export interface GradeOption {
  label: string
  points5: number
  points4: number
}

export const GRADE_OPTIONS: Record<string, { points5: number; points4: number }> = {
  'A+': { points5: 5.00, points4: 4.00 },
  'A':  { points5: 4.75, points4: 3.75 },
  'B+': { points5: 4.50, points4: 3.50 },
  'B':  { points5: 4.00, points4: 3.00 },
  'C+': { points5: 3.50, points4: 2.50 },
  'C':  { points5: 3.00, points4: 2.00 },
  'D+': { points5: 2.50, points4: 1.50 },
  'D':  { points5: 2.00, points4: 1.00 },
  'F':  { points5: 1.00, points4: 0.00 },
}

export function getGradePoint(grade: string, scale: 5 | 4 = 5): number {
  const norm = grade.toUpperCase().trim()
  const found = GRADE_OPTIONS[norm]
  if (!found) return scale === 5 ? 5.0 : 4.0
  return scale === 5 ? found.points5 : found.points4
}

export interface AcademicSummary {
  cumulativeGpa: number
  totalCompletedHours: number
  totalPoints: number
  termGpas: { id: string; name: string; termGpa: number; termHours: number }[]
  honorsTitle: string | null
  honorsBadgeColor: string
  progressPercentage: number
}

export function calculateAcademicSummary(
  semesters: any[] = [],
  scale: 5 | 4 = 5,
  targetHours: number = 134,
  baselineGpa: number = 0,
  baselineHours: number = 0
): AcademicSummary {
  let totalHours = Number(baselineHours) || 0
  let totalPoints = (Number(baselineGpa) || 0) * (Number(baselineHours) || 0)

  const termGpas: { id: string; name: string; termGpa: number; termHours: number }[] = []

  // Sort semesters by createdAt
  const sorted = [...semesters].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

  for (const sem of sorted) {
    let termH = 0
    let termP = 0
    if (Array.isArray(sem.courses)) {
      for (const course of sem.courses) {
        const h = Number(course.creditHours) || 0
        const pts = getGradePoint(course.grade, scale)
        termH += h
        termP += h * pts
      }
    }
    const termGpa = termH > 0 ? Number((termP / termH).toFixed(2)) : 0
    termGpas.push({
      id: sem.id || sem.name,
      name: sem.name,
      termGpa,
      termHours: termH
    })

    totalHours += termH
    totalPoints += termP
  }

  const cumulativeGpa = totalHours > 0 ? Number((totalPoints / totalHours).toFixed(2)) : (Number(baselineGpa) || 0)

  // Honors standing
  let honorsTitle: string | null = null
  let honorsBadgeColor = 'text-accent-blue bg-accent-blue/10 border-accent-blue/20'

  if (scale === 5) {
    if (cumulativeGpa >= 4.75) {
      honorsTitle = 'مرتبة الشرف الأولى 🥇'
      honorsBadgeColor = 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    } else if (cumulativeGpa >= 4.25) {
      honorsTitle = 'مرتبة الشرف الثانية 🥈'
      honorsBadgeColor = 'text-slate-300 bg-slate-400/10 border-slate-400/30'
    } else if (cumulativeGpa >= 3.75) {
      honorsTitle = 'تقدير ممتاز ✨'
      honorsBadgeColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    } else if (cumulativeGpa >= 2.75) {
      honorsTitle = 'تقدير جيد جداً'
      honorsBadgeColor = 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    } else if (cumulativeGpa >= 2.00) {
      honorsTitle = 'تقدير جيد'
      honorsBadgeColor = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
    }
  } else {
    if (cumulativeGpa >= 3.75) {
      honorsTitle = 'مرتبة الشرف الأولى 🥇'
      honorsBadgeColor = 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    } else if (cumulativeGpa >= 3.25) {
      honorsTitle = 'مرتبة الشرف الثانية 🥈'
      honorsBadgeColor = 'text-slate-300 bg-slate-400/10 border-slate-400/30'
    } else if (cumulativeGpa >= 3.00) {
      honorsTitle = 'تقدير ممتاز ✨'
      honorsBadgeColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    } else if (cumulativeGpa >= 2.50) {
      honorsTitle = 'تقدير جيد جداً'
      honorsBadgeColor = 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    } else if (cumulativeGpa >= 2.00) {
      honorsTitle = 'تقدير جيد'
      honorsBadgeColor = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
    }
  }

  const progressPercentage = targetHours > 0
    ? Math.min(100, Math.round((totalHours / targetHours) * 100))
    : 0

  return {
    cumulativeGpa,
    totalCompletedHours: totalHours,
    totalPoints: Number(totalPoints.toFixed(2)),
    termGpas,
    honorsTitle,
    honorsBadgeColor,
    progressPercentage
  }
}
