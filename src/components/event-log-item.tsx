import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LockIcon,
  PencilEdit01Icon,
  Alert01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import type { PunchEntry } from "@/lib/types"

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

function getSourceIcon(source: string) {
  switch (source) {
    case "manual":
      return PencilEdit01Icon
    case "estimated":
      return Alert01Icon
    default:
      return LockIcon
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case "manual":
      return "Manual entry"
    case "estimated":
      return "Estimated (crash recovery)"
    default:
      return "Automatic"
  }
}

interface EventLogItemProps {
  entry: PunchEntry
  onDelete: (id: number) => Promise<void>
}

export function EventLogItem({ entry, onDelete }: EventLogItemProps) {
  const [deleting, setDeleting] = useState(false)
  const isIn = entry.type === "LOGIN"
  const SourceIcon = getSourceIcon(entry.source)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 transition-colors hover:bg-card/60">
      {/* Source icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              entry.source === "estimated"
                ? "bg-amber-500/15 text-amber-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <HugeiconsIcon icon={SourceIcon} size={14} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{getSourceLabel(entry.source)}</p>
        </TooltipContent>
      </Tooltip>

      {/* Type badge + trigger */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-bold ${
            isIn
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {isIn ? "IN" : "OUT"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {entry.trigger}
        </span>
      </div>

      {/* Timestamp + actions */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatTime(entry.timestamp)}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              disabled={deleting}
            >
              <HugeiconsIcon icon={Delete02Icon} size={12} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete entry</AlertDialogTitle>
              <AlertDialogDescription>
                Remove this {isIn ? "login" : "logout"} entry at{" "}
                {formatTime(entry.timestamp)}? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
