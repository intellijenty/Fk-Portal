import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import type { EntryType } from "@/lib/types"

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA")
}

function getLocalTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

interface ManualEntryProps {
  onAddEntry: (data: {
    date: string
    time: string
    type: EntryType
    notes?: string
  }) => Promise<void>
}

export function ManualEntry({ onAddEntry }: ManualEntryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState(getLocalDate)
  const [time, setTime] = useState(getLocalTime)
  const [type, setType] = useState<EntryType>("LOGIN")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onAddEntry({ date, time, type })
      // Reset time to now after submit
      setTime(getLocalTime())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
        <div className="mt-3 space-y-3 rounded-lg border border-border/50 bg-card/50 p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Time
              </label>
              <Input
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type
              </label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as EntryType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOGIN">Punch IN</SelectItem>
                  <SelectItem value="LOGOUT">Punch OUT</SelectItem>
                </SelectContent>
              </Select>
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
