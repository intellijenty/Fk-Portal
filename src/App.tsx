import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { StatusCard } from "@/components/status-card"
import { TotalCard } from "@/components/total-card"
import { ManualEntry } from "@/components/manual-entry"
import { EventLog } from "@/components/event-log"
import { PortalSection } from "@/components/portal-section"
import { DayView } from "@/components/day-view"
import { WeeklyCalendar } from "@/components/weekly-calendar"
import { WeeklyStats } from "@/components/weekly-stats"
import { usePunchData } from "@/hooks/use-punch-data"
import { useWindowSize } from "@/hooks/use-window-size"
import { useDayMarks } from "@/hooks/use-day-marks"
import { getLocalDate, getWeekRange, getDaysOfWeek } from "@/lib/week-utils"
import { getYearMonth, getWeekdaysInMonth } from "@/lib/month-utils"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { MonthlyInsights } from "@/components/monthly-insights"
import { usePortalRange } from "@/hooks/use-portal-range"
import { HugeiconsIcon } from "@hugeicons/react"
import { Timer02Icon, Globe02Icon, Calendar02Icon } from "@hugeicons/core-free-icons"
import { NarrowBalanceChips } from "@/components/narrow-insight-bar"
import { PortalStoreProvider, usePortalStoreContext } from "@/contexts/portal-store"
import { SettingsDialog } from "@/components/settings-dialog"
import { useHotkeyBehavior } from "@/hooks/use-hotkey-behavior"

const WIDE_BREAKPOINT = 860
const ULTRA_WIDE_BREAKPOINT = 1200

// ── Narrow layout: identical to original ──

function NarrowLayout() {
  const {
    status,
    events,
    loading,
    lastUpdated,
    addEntry,
    editEntry,
    deleteEntry,
  } = usePunchData()

  if (loading || !status) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">
          Loading...
        </div>
      </div>
    )
  }

  // Format: "Wednesday, 15 April"
  const headerDate = (() => {
    const d = new Date()
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" })
    const day = d.getDate()
    const month = d.toLocaleDateString("en-US", { month: "short" })
    const year = d.getFullYear()
    return `${weekday}, ${day} ${month} ${year}`
  })()

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Date */}
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={Calendar02Icon}
              size={14}
              className="shrink-0 text-muted-foreground"
            />
            <span className="text-sm font-medium tracking-tight">
              {headerDate}
            </span>
          </div>
          {/* Balance chips — hidden when not connected */}
          <NarrowBalanceChips />
        </div>
      </header>

      <div className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5">
        <div className="shrink-0">
          <PortalSection />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Local
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <StatusCard status={status} />
          <TotalCard
            totalSeconds={status.totalSecondsToday}
            isIn={status.isIn}
          />
        </div>

        <div className="shrink-0">
          <ManualEntry
            date={new Date().toLocaleDateString("en-CA")}
            onAddEntry={addEntry}
          />
        </div>

        <EventLog
          entries={events}
          lastUpdated={lastUpdated}
          onDelete={deleteEntry}
          onEdit={editEntry}
        />
      </div>
    </div>
  )
}

// ── Wide layout: receives all shared state as props ──

interface WideLayoutProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  dayMarks: Map<string, import("@/lib/week-utils").DayMark>
  onCycleMark: (date: string) => void
}

function WideLayout({
  selectedDate,
  onSelectDate,
  dayMarks,
  onCycleMark,
}: WideLayoutProps) {
  const weekRange = getWeekRange(selectedDate)
  const weekDays = getDaysOfWeek(weekRange.start)
  const { summaries } = usePortalRange(weekDays)
  const { connected: portalConnected } = usePortalStoreContext()

  return (
    <div className="flex h-screen bg-background">
      {/* Left panel — calendar + stats */}
      <aside className="scrollbar-hide relative flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-border/50">
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Timer02Icon}
                size={18}
                className="text-muted-foreground"
              />
              <h1 className="text-base font-semibold tracking-tight">
                Punch Monitor
              </h1>
            </div>
            <SettingsDialog />
          </div>
        </div>

        <div className="px-5 pb-4">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            weekSummaries={summaries}
            dayMarks={dayMarks}
          />
        </div>

        <div className="mx-5 h-px bg-border/50" />

        <div className="flex-1 px-5 py-4">
          <WeeklyStats
            weekSummaries={summaries}
            selectedDate={selectedDate}
            dayMarks={dayMarks}
            onCycleMark={onCycleMark}
          />
        </div>

        {/* Portal blur overlay */}
        {!portalConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[3px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/40">
              <HugeiconsIcon
                icon={Globe02Icon}
                size={24}
                className="text-muted-foreground/60"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">
                Portal data unavailable
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Connect via the Portal section →
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Right panel — day view */}
      <main className="flex w-[480px] shrink-0 flex-col overflow-hidden">
        <DayView date={selectedDate} showHeader />
      </main>
    </div>
  )
}

// ── Ultra-wide layout: month + week + day ──

function UltraWideLayout({
  selectedDate,
  onSelectDate,
  dayMarks,
  onCycleMark,
}: WideLayoutProps) {
  const yearMonth = getYearMonth(selectedDate)
  const weekRange = getWeekRange(selectedDate)
  const today = getLocalDate()
  const monthDays = getWeekdaysInMonth(yearMonth, today)
  const weekDays = getDaysOfWeek(weekRange.start)
  const { summaries: monthSummaries } = usePortalRange(monthDays)
  const { summaries: weekSummaries } = usePortalRange(weekDays)
  const { connected: portalConnected } = usePortalStoreContext()

  return (
    <div className="flex h-screen bg-background">
      {/* Left — monthly calendar + insights */}
      <aside className="scrollbar-hide relative flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-border/50">
        <div className="shrink-0 px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Timer02Icon}
                size={18}
                className="text-muted-foreground"
              />
              <h1 className="text-base font-semibold tracking-tight">
                Punch Monitor
              </h1>
            </div>
            <SettingsDialog />
          </div>
        </div>

        <div className="px-4 pb-3">
          <MonthlyCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            monthSummaries={monthSummaries}
            dayMarks={dayMarks}
          />
        </div>

        <div className="mx-4 h-px bg-border/50" />

        <div className="flex-1 px-4 py-3">
          <MonthlyInsights
            monthSummaries={monthSummaries}
            selectedDate={selectedDate}
            dayMarks={dayMarks}
            onSelectDate={onSelectDate}
          />
        </div>

        {/* Portal blur overlay */}
        {!portalConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[3px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/40">
              <HugeiconsIcon
                icon={Globe02Icon}
                size={22}
                className="text-muted-foreground/60"
              />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground/70">
                Monthly data
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Connect to portal to view
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Middle — weekly calendar + stats */}
      <section className="scrollbar-hide relative flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-border/50">
        <div className="px-5 pt-5 pb-4">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            weekSummaries={weekSummaries}
            dayMarks={dayMarks}
          />
        </div>

        <div className="mx-5 h-px bg-border/50" />

        <div className="flex-1 px-5 py-4">
          <WeeklyStats
            weekSummaries={weekSummaries}
            selectedDate={selectedDate}
            dayMarks={dayMarks}
            onCycleMark={onCycleMark}
          />
        </div>

        {/* Portal blur overlay */}
        {!portalConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[3px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/40">
              <HugeiconsIcon
                icon={Globe02Icon}
                size={22}
                className="text-muted-foreground/60"
              />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground/70">
                Weekly stats
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Connect to portal to view
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Right — day view */}
      <main className="flex w-[480px] shrink-0 flex-col overflow-hidden">
        <DayView date={selectedDate} showHeader />
      </main>
    </div>
  )
}

// ── Root: owns all shared state, survives layout transitions ──

export default function App() {
  const { width } = useWindowSize()
  const isUltraWide = width >= ULTRA_WIDE_BREAKPOINT
  const isWide = width >= WIDE_BREAKPOINT
  const [selectedDate, setSelectedDate] = useState(getLocalDate())
  const { dayMarks, cycleMark } = useDayMarks()
  useHotkeyBehavior()

  return (
    <TooltipProvider>
      <PortalStoreProvider>
        {isUltraWide ? (
          <UltraWideLayout
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dayMarks={dayMarks}
            onCycleMark={cycleMark}
          />
        ) : isWide ? (
          <WideLayout
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dayMarks={dayMarks}
            onCycleMark={cycleMark}
          />
        ) : (
          <NarrowLayout />
        )}
      </PortalStoreProvider>
    </TooltipProvider>
  )
}
