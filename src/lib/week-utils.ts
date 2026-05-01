export function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function getWeekRange(date: string): { start: string; end: string } {
  const d = new Date(date + "T00:00:00")
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return { start: fmt(monday), end: fmt(sunday) }
}

export function getDaysOfWeek(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00")
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return fmt(d)
  })
}

export function shiftWeek(weekStart: string, direction: -1 | 1): string {
  const d = new Date(weekStart + "T00:00:00")
  d.setDate(d.getDate() + direction * 7)
  return fmt(d)
}

export type DayStatus = "critical" | "deficit" | "surplus" | "none"

export function getDayStatus(totalSeconds: number): DayStatus {
  if (totalSeconds === 0) return "none"
  const hours = totalSeconds / 3600
  if (hours < 6) return "critical"
  if (hours < 8) return "deficit"
  return "surplus"
}

export type DayMark = "mp" | "fl" | "hl"

export function computeWeeklyBalance(
  weekDays: string[],
  summaries: { date: string; totalSeconds: number; missPunchCount: number }[],
  today: string,
  dayMarks: Map<string, DayMark>
): {
  balance: number
  effectiveTarget: number
  totalWorked: number
  workingDays: number
  mpDays: number
  leaveDays: number
} {
  let workingDays = 0
  let pastWorkingDays = 0 // excludes today — used for balance target
  let totalWorked = 0
  let workedPast = 0 // excludes today — used for balance only
  let mpDays = 0
  let leaveDays = 0

  const summaryMap = new Map(summaries.map((s) => [s.date, s]))

  for (const date of weekDays) {
    const dow = new Date(date + "T00:00:00").getDay()
    if (dow < 1 || dow > 5) continue // skip weekends

    const mark = dayMarks.get(date)
    const isFuture = date > today
    const isToday = date === today

    if (isFuture) {
      // Future day: only affects effectiveTarget, no worked credit yet
      if (mark === "mp") mpDays++
      else {
        workingDays++
        if (mark === "fl" || mark === "hl") leaveDays++
      }
      continue
    }

    // Past or today: counts toward effectiveTarget and totalWorked
    const summary = summaryMap.get(date)
    const autoMP = (summary?.missPunchCount ?? 0) > 0
    const portalSecs = summary?.totalSeconds || 0

    if (mark === "fl") {
      leaveDays++; workingDays++
      if (!isToday) pastWorkingDays++
      totalWorked += 8 * 3600
      if (!isToday) workedPast += 8 * 3600
    } else if (mark === "hl") {
      leaveDays++; workingDays++
      if (!isToday) pastWorkingDays++
      totalWorked += portalSecs + 4 * 3600
      if (!isToday) workedPast += portalSecs + 4 * 3600
    } else if (mark === "mp" || autoMP) {
      mpDays++
    } else {
      workingDays++
      if (!isToday) pastWorkingDays++
      totalWorked += portalSecs
      if (!isToday) workedPast += portalSecs
    }
  }

  const effectiveTarget = workingDays * 8 * 3600
  const pastTarget = pastWorkingDays * 8 * 3600
  return {
    balance: workedPast - pastTarget,
    effectiveTarget,
    totalWorked,
    workingDays,
    mpDays,
    leaveDays,
  }
}

export function formatHM(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  return `${h}h ${String(m).padStart(2, "0")}m`
}

export function formatSignedHM(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "-"
  return `${sign}${formatHM(seconds)}`
}

export function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${sStr} – ${eStr}`
}

export function formatDateDisplay(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-CA")
}
