import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
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
import { HugeiconsIcon } from "@hugeicons/react"
import { Info } from "@hugeicons/core-free-icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MARK_LABELS: Record<DayMark, string> = { mp: "MP", fl: "FL", hl: "HL" }
const MARK_TITLE_NEXT: Record<string, string> = {
  "": "Click → Miss Punch",
  mp: "Click → Full Leave",
  fl: "Click → Half Leave",
  hl: "Click → Clear",
}

const BAR_FILLS: Record<string, string> = {
  surplus: "#10b981",
  deficit: "#f59e0b",
  critical: "#ef4444",
  mp: "rgba(239,68,68,0.25)",
  fl: "rgba(139,92,246,0.4)",
  hl: "rgba(56,189,248,0.4)",
  none: "rgba(255,255,255,0.06)",
  today: "#6366f1",
}

const chartConfig = {
  hours: { label: "Hours", color: "#10b981" },
} satisfies ChartConfig

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

  // Build chart data — weekdays only (Mon-Fri)
  const weekdays = days.slice(0, 5)
  const chartData = weekdays.map((date, i) => {
    const isToday = date === today
    const isFuture = date > today
    const summary = summaryMap.get(date)
    const mark = dayMarks.get(date)
    const autoMP = (summary?.missPunchCount ?? 0) > 0
    const isMP = mark === "mp" || (autoMP && mark !== "fl" && mark !== "hl")
    const isFL = mark === "fl"
    const isHL = mark === "hl"

    const portalSecs = summary?.totalSeconds || 0
    const displaySecs = isMP
      ? 0
      : isFL
        ? 8 * 3600
        : isHL
          ? portalSecs + 4 * 3600
          : portalSecs
    const hours = displaySecs / 3600
    const diff = displaySecs - 8 * 3600

    const status =
      isMP || isFL || isHL
        ? isMP
          ? "mp"
          : isFL
            ? "fl"
            : "hl"
        : isToday
          ? "today"
          : getDayStatus(displaySecs)

    return {
      label: DAY_LABELS[i],
      date,
      hours: isFuture ? 0 : hours,
      displayHours: isFuture
        ? "—"
        : isMP
          ? "MP"
          : isFL
            ? "FL"
            : hours > 0
              ? formatHM(displaySecs)
              : "—",
      diff,
      fill: isFuture ? BAR_FILLS.none : BAR_FILLS[status] || BAR_FILLS.none,
      isToday,
      isFuture,
      isMP,
      isFL,
      isHL,
      mark,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Weekly total */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
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

      {/* Bar chart */}
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            domain={[0, 10]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(v: number) => `${v}h`}
          />
          <ReferenceLine
            y={8}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
            label={{
              value: "8h target",
              position: "insideTopRight",
              fill: "rgba(255,255,255,0.25)",
              fontSize: 10,
            }}
          />
          <ChartTooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{d.label}</p>
                  <p className="mt-0.5 font-mono text-muted-foreground tabular-nums">
                    {d.displayHours}
                  </p>
                  {!d.isMP &&
                    !d.isFL &&
                    !d.isFuture &&
                    !d.isToday &&
                    d.hours > 0 && (
                      <p
                        className={`mt-0.5 font-mono tabular-nums ${
                          d.diff >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatSignedHM(d.diff)} vs target
                      </p>
                    )}
                </div>
              )
            }}
          />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Mark toggles — aligned 5 cols matching chart bars */}
      <div
        className="grid grid-cols-5 gap-1"
        style={{ marginLeft: 12, marginRight: 4 }}
      >
        {chartData.map((d) => {
          const dow = new Date(d.date + "T00:00:00").getDay()
          const isWeekday = dow >= 1 && dow <= 5
          const canToggle = isWeekday && !d.isToday

          return (
            <div key={d.date} className="flex flex-col items-center gap-0.5">
              {canToggle ? (
                <button
                  onClick={() => onCycleMark(d.date)}
                  className={`w-full rounded px-1 py-0.5 text-center text-[9px] font-bold transition-colors ${
                    d.isMP
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : d.isFL
                        ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                        : d.isHL
                          ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
                          : "bg-muted/40 text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground"
                  }`}
                  title={MARK_TITLE_NEXT[d.mark || ""]}
                >
                  {d.mark ? MARK_LABELS[d.mark] : "—"}
                </button>
              ) : (
                <span className="w-full rounded bg-transparent px-1 py-0.5 text-center text-[9px] text-transparent">
                  —
                </span>
              )}
              {/* Diff below toggle */}
              <span
                className={`font-mono text-[9px] tabular-nums ${
                  d.isFuture || d.isToday || d.isMP || d.isFL || d.hours === 0
                    ? "text-transparent"
                    : d.diff >= 0
                      ? "text-emerald-400"
                      : d.diff > -7200
                        ? "text-amber-400"
                        : "text-red-400"
                }`}
              >
                {!d.isMP && !d.isFL && !d.isToday && d.hours > 0
                  ? formatSignedHM(d.diff)
                  : "·"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Balance */}
      <div
        className={`flex items-center justify-center rounded-lg px-3 py-2.5 text-center ${
          wb.balance >= 0
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}
      >
        <p className="text-xs font-medium">
          Balance: {formatSignedHM(wb.balance)}{" "}
          {wb.balance >= 0 ? "ahead" : "behind"}
        </p>
        <Tooltip>
          <TooltipTrigger>
            <HugeiconsIcon
              name="info"
              icon={Info}
              className="mb-1 ml-1 inline size-3"
            />
          </TooltipTrigger>
          <TooltipContent>Excluding today</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
