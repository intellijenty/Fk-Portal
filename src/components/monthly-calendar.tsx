import type { WeekDaySummary } from "@/lib/types"
import type { DayMark } from "@/lib/week-utils"
import { getDayStatus, getLocalDate, getWeekRange } from "@/lib/week-utils"
import { DayContextMenu } from "@/components/day-context-menu"
import {
  getYearMonth,
  getMonthRange,
  getMonthLabel,
  getWeeksOfMonth,
  shiftMonth,
} from "@/lib/month-utils"

const COL_HEADERS = ["M", "T", "W", "T", "F", "S", "S"]

const DOT_COLORS: Record<string, string> = {
  surplus: "bg-emerald-500",
  deficit: "bg-amber-500",
  critical: "bg-red-500",
  none: "bg-muted-foreground/20",
}

interface MonthlyCalendarProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  monthSummaries: WeekDaySummary[]
  dayMarks: Map<string, DayMark>
  onSetMark?: (date: string, mark: DayMark | null) => void
}

export function MonthlyCalendar({
  selectedDate,
  onSelectDate,
  monthSummaries,
  dayMarks,
  onSetMark,
}: MonthlyCalendarProps) {
  const yearMonth = getYearMonth(selectedDate)
  const { start, end } = getMonthRange(yearMonth)
  const weeks = getWeeksOfMonth(yearMonth)
  const today = getLocalDate()
  const selectedWeekStart = getWeekRange(selectedDate).start

  const summaryMap = new Map(monthSummaries.map((s) => [s.date, s]))

  return (
    <div className="space-y-2">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSelectDate(shiftMonth(selectedDate, -1))}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ◀
        </button>
        <span className="text-xs font-medium">{getMonthLabel(yearMonth)}</span>
        <button
          onClick={() => onSelectDate(shiftMonth(selectedDate, 1))}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ▶
        </button>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-7">
        {COL_HEADERS.map((h, i) => (
          <div
            key={i}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => {
          const isSelectedWeek = week[0] === selectedWeekStart

          return (
            <div
              key={wi}
              className={`grid grid-cols-7 rounded-md transition-colors ${
                isSelectedWeek ? "bg-muted/40" : ""
              }`}
            >
              {week.map((date) => {
                const inMonth = date >= start && date <= end
                const isSelected = date === selectedDate
                const isToday = date === today
                const isFuture = date > today
                const summary = summaryMap.get(date)
                const mark = dayMarks.get(date)
                const autoMP = (summary?.missPunchCount ?? 0) > 0
                const isMP =
                  mark === "mp" || (autoMP && mark !== "fl" && mark !== "hl")
                const isFL = mark === "fl"
                const isHL = mark === "hl"
                const isLeave = isFL || isHL
                const status =
                  isMP || isLeave
                    ? "none"
                    : summary
                      ? getDayStatus(summary.totalSeconds)
                      : "none"
                const dateNum = new Date(date + "T00:00:00").getDate()

                const dotColor = isMP
                  ? "bg-red-500/50"
                  : isFL
                    ? "bg-violet-500/50"
                    : isHL
                      ? "bg-sky-500/50"
                      : DOT_COLORS[status]

                const tile = (
                  <button
                    key={date}
                    onClick={() => inMonth && onSelectDate(date)}
                    disabled={!inMonth}
                    className={`flex flex-col items-center rounded py-1 text-[11px] transition-colors ${
                      !inMonth
                        ? "pointer-events-none opacity-15"
                        : isSelected
                          ? "bg-primary text-primary-foreground"
                          : isFuture
                            ? "opacity-35"
                            : "hover:bg-muted/60"
                    } ${isToday && !isSelected ? "font-bold text-primary" : ""}`}
                  >
                    <span className="leading-tight">{dateNum}</span>
                    <div
                      className={`mt-0.5 h-1 w-3 rounded-full ${
                        isSelected ? "bg-primary-foreground/40" : dotColor
                      }`}
                    />
                  </button>
                )

                return inMonth && onSetMark ? (
                  <DayContextMenu
                    key={date}
                    date={date}
                    mark={mark}
                    onSetMark={onSetMark}
                  >
                    {tile}
                  </DayContextMenu>
                ) : tile
              })}
            </div>
          )
        })}
      </div>

      {/* Jump to today */}
      {getYearMonth(today) !== yearMonth && (
        <div className="pt-1 text-center">
          <button
            onClick={() => onSelectDate(today)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Jump to today
          </button>
        </div>
      )}
    </div>
  )
}
