import { useMemo } from "react"
import { usePortalRange } from "@/hooks/use-portal-range"
import { useDayMarks } from "@/hooks/use-day-marks"
import { getLocalDate, getWeekRange, getDaysOfWeek } from "@/lib/week-utils"

const WEEKLY_TARGET_MIN = 2400 // 40h × 60

function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export interface WeeklyTargetResult {
  /** Today's adjusted daily target in minutes */
  adjustedTargetMinutes: number
  /** True when Mon–today total ≥ 40h */
  weeklyComplete: boolean
  /** Human-readable explanation of the adjustment, null if standard 8h */
  tooltipText: string | null
  /** Whether target differs from the standard 8h */
  isAdjusted: boolean
  /** How the target was determined — "user-override" reserved for future manual override feature */
  source: "standard" | "weekly-adjusted"
}

/**
 * Computes today's adjusted daily target based on the 40h weekly goal.
 *
 * On Friday only: target is set so that the week lands on exactly 40h,
 * clamped to a floor (6h full day / 4h half day) and no ceiling.
 *
 * @param todayLiveMinutes  Live portal minutes for today (for accurate weeklyComplete).
 */
export function useWeeklyTarget(todayLiveMinutes = 0): WeeklyTargetResult {
  const today = getLocalDate()
  const weekDays = getDaysOfWeek(getWeekRange(today).start)
  // Today's contribution comes from todayLiveMinutes — no portal fetch needed for it here.
  // Exclude today so this hook never triggers an unnecessary API call when the user navigates away from today's view.
  const pastWeekDays = weekDays.filter((d) => d < today)
  const { summaries } = usePortalRange(pastWeekDays)
  const { dayMarks } = useDayMarks()

  return useMemo(() => {
    // Minutes worked Mon–(yesterday) from portal cache, with leave marks applied
    const workedBeforeToday = summaries
      .filter((s) => s.date < today)
      .reduce((sum, s) => {
        const mark = dayMarks.get(s.date)
        const autoMP = s.missPunchCount > 0
        if (mark === "mp" || (autoMP && mark !== "fl" && mark !== "hl")) return sum
        if (mark === "fl") return sum + 480
        if (mark === "hl") return sum + Math.floor(s.totalSeconds / 60) + 240
        return sum + Math.floor(s.totalSeconds / 60)
      }, 0)

    const totalWorked = workedBeforeToday + todayLiveMinutes
    const weeklyComplete = totalWorked >= WEEKLY_TARGET_MIN

    const dow = new Date(`${today}T00:00:00`).getDay() // 1=Mon … 5=Fri
    const isFriday = dow === 5

    if (!isFriday) {
      return {
        adjustedTargetMinutes: 480,
        weeklyComplete,
        tooltipText: null,
        isAdjusted: false,
        source: "standard",
      }
    }

    // ── Friday adjustment ──
    const mark = dayMarks.get(today)
    const floor = mark === "hl" ? 240 : 360 // HL=4h, full day=6h minimum

    // Total minutes needed today to hit 40h — portal-total-card subtracts worked, so don't pre-subtract here
    const remaining = Math.max(0, WEEKLY_TARGET_MIN - workedBeforeToday)
    // Never go below floor; no ceiling (can exceed 8h to catch up)
    const adjusted = Math.max(floor, remaining)
    const isAdjusted = adjusted !== 480

    let tooltipText: string | null = null
    if (remaining <= 0) {
      tooltipText = "All done for the week."
    } else if (remaining > 480) {
      tooltipText = `Target Extended to ${fmtHM(adjusted)}. Today needs a bit extra to reach weekly target.`
    } else {
      tooltipText = `Target Reduced to ${fmtHM(adjusted)}.${adjusted !== remaining ? ` Only ${fmtHM(remaining)} needed to hit weekly target.` : ""}`
    }

    return { adjustedTargetMinutes: adjusted, weeklyComplete, tooltipText, isAdjusted, source: "weekly-adjusted" }
  }, [summaries, dayMarks, today, todayLiveMinutes])
}
