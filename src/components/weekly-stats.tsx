import type { WeekDaySummary } from "@/lib/types"
import {
  getDaysOfWeek,
  getWeekRange,
  getDayStatus,
  computeWeeklyBalance,
  formatHM,
  formatSignedHM,
  getLocalDate,
  type DayMark,
} from "@/lib/week-utils"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const STATUS_BAR_COLORS: Record<string, string> = {
  surplus: "bg-emerald-500",
  deficit: "bg-amber-500",
  critical: "bg-red-500",
  none: "bg-muted",
}

const MARK_LABELS: Record<DayMark, string> = { mp: "MP", fl: "FL", hl: "HL" }
const MARK_TITLE_NEXT: Record<string, string> = {
  "": "Click → Miss Punch",
  mp: "Click → Full Leave",
  fl: "Click → Half Leave",
  hl: "Click → Clear",
}

interface WeeklyStatsProps {
  weekSummaries: WeekDaySummary[]
  selectedDate: string
  dayMarks: Map<string, DayMark>
  onCycleMark: (date: string) => void
}

export function WeeklyStats({
  weekSummaries,
  selectedDate,
  dayMarks,
  onCycleMark,
}: WeeklyStatsProps) {
  const today = getLocalDate()
  const weekRange = getWeekRange(selectedDate)
  const days = getDaysOfWeek(weekRange.start)
  const summaryMap = new Map(weekSummaries.map((s) => [s.date, s]))

  const wb = computeWeeklyBalance(days, weekSummaries, today, dayMarks)
  const targetHours = Math.floor(wb.effectiveTarget / 3600)
  const weekPct =
    wb.effectiveTarget > 0
      ? Math.min(100, Math.round((wb.totalWorked / wb.effectiveTarget) * 100))
      : 0

  return (
    <div className="space-y-4">
      {/* Weekly total */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Weekly Hours
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatHM(wb.totalWorked)}{" "}
            <span className="text-muted-foreground">/ {targetHours}h</span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        {(wb.mpDays > 0 || wb.leaveDays > 0) && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {[
              wb.mpDays > 0 && `${wb.mpDays} MP`,
              wb.leaveDays > 0 && `${wb.leaveDays} leave`,
            ]
              .filter(Boolean)
              .join(", ")}{" "}
            — target adjusted
          </p>
        )}
      </div>

      {/* Daily breakdown */}
      <div className="space-y-1">
        {days.map((date, i) => {
          const isToday = date === today
          const isFuture = date > today
          const dow = new Date(date + "T00:00:00").getDay()
          const isWeekday = dow >= 1 && dow <= 5
          const summary = summaryMap.get(date)
          const mark = dayMarks.get(date)
          const autoMP = (summary?.missPunchCount ?? 0) > 0
          const isMP = mark === "mp" || (autoMP && mark !== "fl" && mark !== "hl")
          const isFL = mark === "fl"
          const isHL = mark === "hl"
          const isLeave = isFL || isHL

          // For HL: show portal hours + 4h credit
          const portalSecs = summary?.totalSeconds || 0
          const displaySecs = isMP ? 0 : isFL ? 8 * 3600 : isHL ? portalSecs + 4 * 3600 : portalSecs
          const status = isMP || isLeave ? "none" : getDayStatus(displaySecs)
          const pct = Math.min(100, Math.round((displaySecs / (10 * 3600)) * 100))
          const diff = displaySecs - 8 * 3600

          return (
            <div
              key={date}
              className={`flex items-center gap-2 text-xs ${
                isFuture && !isLeave ? "opacity-30" : ""
              }`}
            >
              <span
                className={`w-7 shrink-0 font-medium ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {DAY_LABELS[i]}
              </span>

              {/* Progress bar */}
              <div className="relative h-1 flex-1 rounded-full bg-muted">
                <div
                  className="absolute top-0 h-full w-px bg-foreground/20"
                  style={{ left: "80%" }}
                />
                {isMP ? (
                  <div className="h-full w-full rounded-full bg-red-500/20" />
                ) : isFL ? (
                  <div
                    className="h-full rounded-full bg-violet-500/30"
                    style={{ width: "80%" }}
                  />
                ) : isHL ? (
                  <div
                    className="h-full rounded-full bg-violet-500/30"
                    style={{ width: `${pct}%` }}
                  />
                ) : (
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_COLORS[status]}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>

              {/* Hours */}
              <span className="w-12 text-right font-mono tabular-nums text-muted-foreground">
                {isMP
                  ? "—"
                  : isFL
                    ? "FL"
                    : isHL
                      ? formatHM(displaySecs)
                      : displaySecs > 0
                        ? formatHM(displaySecs)
                        : "—"}
              </span>

              {/* Mark toggle */}
              {isWeekday && !isToday ? (
                <button
                  onClick={() => onCycleMark(date)}
                  className={`w-7 rounded px-1 py-0.5 text-center text-[9px] font-bold transition-colors ${
                    isMP
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : isFL
                        ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                        : isHL
                          ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
                          : "bg-muted/50 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
                  }`}
                  title={MARK_TITLE_NEXT[mark || ""]}
                >
                  {mark ? MARK_LABELS[mark] : "—"}
                </button>
              ) : (
                <span className="w-7" />
              )}

              {/* Diff */}
              <span
                className={`w-14 text-right font-mono text-[10px] tabular-nums ${
                  isFuture || isToday || isMP || isFL || displaySecs === 0
                    ? "text-transparent"
                    : diff >= 0
                      ? "text-emerald-400"
                      : diff > -7200
                        ? "text-amber-400"
                        : "text-red-400"
                }`}
              >
                {!isMP && !isFL && !isToday && displaySecs > 0
                  ? formatSignedHM(diff)
                  : ""}
              </span>
            </div>
          )
        })}
      </div>

      {/* Balance */}
      <div
        className={`rounded-lg px-3 py-2.5 text-center ${
          wb.balance >= 0
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}
      >
        <p className="text-xs font-medium">
          Balance: {formatSignedHM(wb.balance)}{" "}
          {wb.balance >= 0 ? "ahead" : "behind"}
        </p>
        <p className="mt-0.5 text-[10px] opacity-60">excludes today</p>
      </div>
    </div>
  )
}
