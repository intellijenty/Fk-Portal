import { TooltipProvider } from "@/components/ui/tooltip"
import { StatusCard } from "@/components/status-card"
import { TotalCard } from "@/components/total-card"
import { PunchButtons } from "@/components/punch-buttons"
import { ManualEntry } from "@/components/manual-entry"
import { EventLog } from "@/components/event-log"
import { PortalSection } from "@/components/portal-section"
import { usePunchData } from "@/hooks/use-punch-data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Timer02Icon } from "@hugeicons/core-free-icons"

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function App() {
  const {
    status,
    events,
    loading,
    lastUpdated,
    punchIn,
    punchOut,
    addEntry,
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

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="shrink-0 px-5 pt-4 pb-2">
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate()}
          </p>
        </header>

        {/* Content */}
        <div className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5">
          {/* Portal section */}
          <div className="shrink-0">
            <PortalSection />
          </div>

          {/* Local section divider */}
          <div className="flex shrink-0 items-center gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Local
            </h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Status + Total cards */}
          <div className="grid shrink-0 grid-cols-2 gap-3">
            <StatusCard status={status} />
            <TotalCard
              totalSeconds={status.totalSecondsToday}
              isIn={status.isIn}
            />
          </div>

          {/* Punch buttons */}
          <div className="shrink-0">
            <PunchButtons
              isIn={status.isIn}
              onPunchIn={punchIn}
              onPunchOut={punchOut}
            />
          </div>

          {/* Manual entry */}
          <div className="shrink-0">
            <ManualEntry onAddEntry={addEntry} />
          </div>

          {/* Event log - takes remaining space */}
          <EventLog
            entries={events}
            lastUpdated={lastUpdated}
            onDelete={deleteEntry}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
