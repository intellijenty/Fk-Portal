import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import type { EntryType } from "@/lib/types"

function getLocalTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

interface ManualEntryProps {
  /** Date to add the entry to (YYYY-MM-DD). Defaults to today. */
  date?: string
  onAddEntry: (data: {
    date: string
    time: string
    type: EntryType
    notes?: string
  }) => Promise<void>
}

export function ManualEntry({ date, onAddEntry }: ManualEntryProps) {
  const entryDate = date ?? new Date().toLocaleDateString("en-CA")

  const [isOpen, setIsOpen] = useState(false)
  const [time, setTime] = useState(getLocalTime)
  const [type, setType] = useState<EntryType>("LOGIN")
  const [submitting, setSubmitting] = useState(false)

  // Refresh time to "now" when panel opens
  function handleOpenChange(open: boolean) {
    if (open) setTime(getLocalTime())
    setIsOpen(open)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onAddEntry({ date: entryDate, time, type })
      setTime(getLocalTime())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
          <span>Add entry with custom time</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            className={`ml-auto transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 rounded-lg border border-border/50 bg-card/50 p-4">
          <div className="flex gap-3">
            {/* Time input */}
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Type toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <ToggleGroup
                type="single"
                value={type}
                onValueChange={(v) => { if (v) setType(v as EntryType) }}
                className="h-9 rounded-md border border-border/50 bg-muted/20 p-0.5"
              >
                <ToggleGroupItem
                  value="LOGIN"
                  className="h-8 px-4 text-xs font-semibold data-[state=on]:text-emerald-400 data-[state=on]:border-emerald-500/30 data-[state=on]:bg-emerald-500/10"
                >
                  IN
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="LOGOUT"
                  className="h-8 px-4 text-xs font-semibold data-[state=on]:text-red-400 data-[state=on]:border-red-500/30 data-[state=on]:bg-red-500/10"
                >
                  OUT
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <Button
            className="w-full"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            Add Entry
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
