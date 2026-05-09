import { useState } from "react"
import { EventLogItem } from "@/components/event-log-item"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon } from "@hugeicons/core-free-icons"
import type { PunchEntry, WorkWindow } from "@/lib/types"

interface EventLogProps {
  entries: PunchEntry[]
  lastUpdated: Date
  workWindow?: WorkWindow | null
  workMode?: "holiday" | "all" | "window"
  onDeleteConfirmed: (id: number) => Promise<void>
  onDeletePair: (id: number) => Promise<void>
  onEdit: (id: number, updates: { timestamp?: string; notes?: string }) => Promise<void>
}

/** Find the paired counterpart for an entry in a sorted (ASC) entries list. */
function findPaired(sorted: PunchEntry[], targetId: number): PunchEntry | null {
  const idx = sorted.findIndex(e => e.id === targetId)
  if (idx === -1) return null
  const target = sorted[idx]
  if (target.type === "LOGIN") {
    for (let i = idx + 1; i < sorted.length; i++) {
      if (sorted[i].type === "LOGOUT") return sorted[i]
      if (sorted[i].type === "LOGIN") break
    }
  } else {
    for (let i = idx - 1; i >= 0; i--) {
      if (sorted[i].type === "LOGIN") return sorted[i]
      if (sorted[i].type === "LOGOUT") break
    }
  }
  return null
}

function findCorruptedIds(sorted: PunchEntry[]): Set<number> {
  const ids = new Set<number>()
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].type === sorted[i - 1].type) {
      ids.add(sorted[i].id)
      ids.add(sorted[i - 1].id)
    }
  }
  return ids
}

export function EventLog({ entries, lastUpdated, workWindow, workMode, onDeleteConfirmed, onDeletePair, onEdit }: EventLogProps) {
  const [expanded, setExpanded] = useState(false)

  // Sort ASC for pair-finding and corruption detection; display order stays as-received (DESC)
  const sortedAsc = [...entries].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp) || a.id - b.id
  )

  const corruptedIds = findCorruptedIds(sortedAsc)
  const hasCorruption = corruptedIds.size > 0

  const latestPair = entries.slice(0, 2)
  const remaining = entries.slice(2)

  function getPairedId(id: number): number | null {
    return findPaired(sortedAsc, id)?.id ?? null
  }

  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card/20">
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
            {hasCorruption && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-400">
                <HugeiconsIcon icon={Alert01Icon} size={12} className="shrink-0" />
                <span>Consecutive same-type entries detected. Edit or delete to fix.</span>
              </div>
            )}

            {/* Latest pair - always visible */}
            {!expanded && latestPair.map((entry) => (
              <EventLogItem
                key={entry.id}
                entry={entry}
                pairedEntryId={getPairedId(entry.id)}
                isCorrupted={corruptedIds.has(entry.id)}
                workWindow={workWindow}
                workMode={workMode}
                onDeleteConfirmed={onDeleteConfirmed}
                onDeletePair={onDeletePair}
                onEdit={onEdit}
              />
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
                        pairedEntryId={getPairedId(entry.id)}
                        isCorrupted={corruptedIds.has(entry.id)}
                        workWindow={workWindow}
                        workMode={workMode}
                        onDeleteConfirmed={onDeleteConfirmed}
                        onDeletePair={onDeletePair}
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
