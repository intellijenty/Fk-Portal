import { StatusCard } from "@/components/status-card"
import { TotalCard } from "@/components/total-card"
import { ManualEntry } from "@/components/manual-entry"
import { EventLog } from "@/components/event-log"
import { PortalSection } from "@/components/portal-section"
import { usePunchData } from "@/hooks/use-punch-data"
import { formatDateDisplay } from "@/lib/week-utils"

interface DayViewProps {
  date: string
  showHeader?: boolean
}

export function DayView({ date, showHeader = false }: DayViewProps) {
  const {
    status,
    events,
    loading,
    lastUpdated,
    isToday,
    addEntry,
    editEntry,
    deleteEntry,
  } = usePunchData(date)

  if (loading || !status) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <header className="shrink-0 border-b border-border/50 px-5 py-3">
          <p className="text-sm font-medium">{formatDateDisplay(date)}</p>
          {!isToday && (
            <p className="text-[10px] text-muted-foreground/60">
              Historical data
            </p>
          )}
        </header>
      )}

      <div className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-3 pb-5">
        {/* Portal */}
        <div className="shrink-0">
          <PortalSection date={date} variant="wide" />
        </div>

        {/* Local divider */}
        <div className="flex shrink-0 items-center gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Local
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Cards */}
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <StatusCard status={status} />
          <TotalCard
            totalSeconds={status.totalSecondsToday}
            workingSeconds={status.workWindow ? status.workingSecondsToday : undefined}
            isIn={status.isIn}
          />
        </div>

        {/* Manual entry — available for any day */}
        <div className="shrink-0">
          <ManualEntry date={date} onAddEntry={addEntry} />
        </div>

        {/* Event log */}
        <EventLog
          entries={events}
          lastUpdated={lastUpdated}
          workWindow={status.workWindow}
          onDelete={deleteEntry}
          onEdit={editEntry}
        />
      </div>
    </div>
  )
}
