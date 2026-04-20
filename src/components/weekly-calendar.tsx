import { Button } from "@/components/ui/button"
import { DayContextMenu } from "@/components/day-context-menu"
import type { WeekDaySummary, DayWorkWindow, NightShiftConfig } from "@/lib/types"
import {
  getDaysOfWeek,
  shiftWeek,
  getWeekRange,
  getDayStatus,
  formatWeekLabel,
  formatHM,
  getLocalDate,
  type DayMark,
} from "@/lib/week-utils"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const STATUS_COLORS: Record<string, string> = {
  surplus: "bg-emerald-500",
  deficit: "bg-amber-500",
  critical: "bg-red-500",
  none: "bg-muted",
}

interface WeeklyCalendarProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  weekSummaries: WeekDaySummary[]
  dayMarks?: Map<string, DayMark>
  onSetMark?: (date: string, mark: DayMark | null) => void
  workWindows?: Map<string, DayWorkWindow>
  onSetWorkWindow?: (date: string, startTime: string, endTime: string, source?: "nightshift" | "manual") => void
  onDeleteWorkWindow?: (date: string) => void
  nightShift?: NightShiftConfig
}

export function WeeklyCalendar({
  selectedDate,
  onSelectDate,
  weekSummaries,
  dayMarks,
  onSetMark,
  workWindows,
  onSetWorkWindow,
  onDeleteWorkWindow,
  nightShift,
}: WeeklyCalendarProps) {
  const weekRange = getWeekRange(selectedDate)
  const days = getDaysOfWeek(weekRange.start)
  const today = getLocalDate()

  const summaryMap = new Map(weekSummaries.map((s) => [s.date, s]))

  function navigateWeek(direction: -1 | 1) {
    const newWeekStart = shiftWeek(weekRange.start, direction)
    // Select same day-of-week in new week, or first day
    const currentDayIndex = days.indexOf(selectedDate)
    const newDays = getDaysOfWeek(newWeekStart)
    onSelectDate(newDays[currentDayIndex >= 0 ? currentDayIndex : 0])
  }

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ◀
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {formatWeekLabel(weekRange.start, weekRange.end)}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ▶
        </button>
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          const isSelected = date === selectedDate
          const isToday = date === today
          const isFuture = date > today
          const summary = summaryMap.get(date)
          const mark = dayMarks?.get(date)
          const autoMP = (summary?.missPunchCount ?? 0) > 0
          const isMP = mark === "mp" || (autoMP && mark !== "fl" && mark !== "hl")
          const isFL = mark === "fl"
          const isHL = mark === "hl"
          const isLeave = isFL || isHL
          const isMarked = isMP || isLeave
          const status = isMarked ? "none" : summary ? getDayStatus(summary.totalSeconds) : "none"
          const dateNum = new Date(date + "T00:00:00").getDate()

          const tile = (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isFuture
                    ? "text-muted-foreground/40"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">
                {DAY_LABELS[i]}
              </span>
              <span
                className={`text-lg font-semibold leading-none ${
                  isToday && !isSelected ? "text-primary" : ""
                }`}
              >
                {dateNum}
              </span>
              <div
                className={`mt-0.5 h-1 w-full rounded-full ${
                  isSelected
                    ? "bg-primary-foreground/30"
                    : isFL
                      ? "bg-violet-500/40"
                      : isHL
                        ? "bg-sky-500/40"
                        : isMP
                        ? "bg-red-500/30"
                        : STATUS_COLORS[status]
                }`}
              />
              <span className="text-[10px] tabular-nums opacity-70">
                {isMP
                  ? "—"
                  : isLeave
                    ? "—"
                    : summary && summary.totalSeconds > 0
                      ? formatHM(summary.totalSeconds)
                      : "—"}
              </span>
              {isMP && (
                <span
                  className={`text-[9px] font-medium ${
                    isSelected ? "text-red-200" : "text-red-400"
                  }`}
                >
                  MP
                </span>
              )}
              {isFL && (
                <span
                  className={`text-[9px] font-medium ${
                    isSelected ? "text-violet-200" : "text-violet-400"
                  }`}
                >
                  FL
                </span>
              )}
              {isHL && (
                <span
                  className={`text-[9px] font-medium ${
                    isSelected ? "text-sky-200" : "text-sky-400"
                  }`}
                >
                  HL
                </span>
              )}
            </button>
          )

          return onSetMark ? (
            <DayContextMenu
              key={date}
              date={date}
              mark={mark}
              onSetMark={onSetMark}
              workWindow={workWindows?.get(date)}
              onSetWorkWindow={onSetWorkWindow}
              onDeleteWorkWindow={onDeleteWorkWindow}
              nightShift={nightShift}
            >
              {tile}
            </DayContextMenu>
          ) : tile
        })}
      </div>

      {/* Today button */}
      {!days.includes(today) && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => onSelectDate(today)}
          >
            Jump to today
          </Button>
        </div>
      )}
    </div>
  )
}
