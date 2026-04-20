import { useState } from "react"
import { EventLogItem } from "@/components/event-log-item"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { PunchEntry, WorkWindow } from "@/lib/types"

function formatUpdateTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

interface EventLogProps {
  entries: PunchEntry[]
  lastUpdated: Date
  workWindow?: WorkWindow | null
  onDelete: (id: number) => Promise<void>
  onEdit: (id: number, updates: { timestamp?: string; notes?: string }) => Promise<void>
}

export function EventLog({ entries, lastUpdated, workWindow, onDelete, onEdit }: EventLogProps) {
  const [expanded, setExpanded] = useState(false)

  const latestPair = entries.slice(0, 2)
  const remaining = entries.slice(2)

  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card/20">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold">Today&apos;s Log</h2>
        <span className="text-xs text-muted-foreground">
          Updated {formatUpdateTime(lastUpdated)}
        </span>
      </div>

      <div className="p-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No events today</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Events will appear here when your laptop locks or unlocks
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Latest pair - always visible */}
            {!expanded && latestPair.map((entry) => (
              <EventLogItem key={entry.id} entry={entry} workWindow={workWindow} onDelete={onDelete} onEdit={onEdit} />
            ))}

            {/* Older entries - collapsible */}
            {remaining.length > 0 && (
              <Collapsible open={expanded} onOpenChange={setExpanded}>
                <CollapsibleContent>
                  <div className="scrollbar-hide mb-1.5 max-h-48 space-y-1.5 overflow-y-auto">
                    {entries.map((entry) => (
                      <EventLogItem
                        key={entry.id}
                        entry={entry}
                        workWindow={workWindow}
                        onDelete={onDelete}
                        onEdit={onEdit}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                  <button className="w-full rounded-lg border border-dashed border-border/40 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border/70 hover:text-foreground">
                    {expanded
                      ? "Show less"
                      : `${remaining.length} older ${remaining.length === 1 ? "entry" : "entries"}`}
                  </button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
