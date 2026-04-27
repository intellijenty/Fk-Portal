/**
 * DayContextMenu — reusable right-click context menu for any day tile.
 *
 * Wraps its children with ContextMenuTrigger so left-click behaviour
 * (selection, navigation) is completely unaffected — only right-click opens
 * this menu.
 *
 * Usage:
 *   <DayContextMenu date={date} mark={mark} onSetMark={onSetMark}>
 *     <button ...>...</button>
 *   </DayContextMenu>
 *
 * Portal cache operations are sourced directly from PortalStoreContext so the
 * caller only needs to own the mark state.
 *
 * Adding future sections:
 *   Add a new <ContextMenuSub> block and a matching entry in MENU_SECTIONS if
 *   you want to maintain order declaratively, or just append below the Data
 *   section. Keep each section self-contained.
 */

import { useState } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuItem,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { usePortalStoreContext } from "@/contexts/portal-store"
import { getLocalDate, type DayMark } from "@/lib/week-utils"
import type { DayWorkWindow, NightShiftConfig } from "@/lib/types"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Database02Icon,
  RefreshIcon,
  Delete02Icon,
  Time04Icon,
} from "@hugeicons/core-free-icons"

// ── Mark type registry ────────────────────────────────────────────────────────
// Add new mark types here; the submenu renders from this list automatically.

interface MarkDef {
  value: DayMark
  label: string
  dotClass: string
}

const MARK_DEFS: MarkDef[] = [
  { value: "mp", label: "Miss Punch", dotClass: "bg-red-500/70" },
  { value: "fl", label: "Full Leave", dotClass: "bg-violet-500/70" },
  { value: "hl", label: "Half Leave", dotClass: "bg-sky-500/70" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDayHeader(date: string): string {
  const d = new Date(date + "T00:00:00")
  const thisYear = new Date().getFullYear()
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== thisYear ? { year: "numeric" } : {}),
  })
}

function resolveRadioValue(workWindow?: DayWorkWindow | null): string {
  if (!workWindow) return "default"
  return workWindow.source // "default" | "nightshift" | "manual"
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DayContextMenuProps {
  date: string
  mark: DayMark | undefined
  onSetMark: (date: string, mark: DayMark | null) => void
  workWindow?: DayWorkWindow | null
  onSetWorkWindow?: (
    date: string,
    startTime: string,
    endTime: string,
    source?: "nightshift" | "manual" | "disabled"
  ) => void
  onDeleteWorkWindow?: (date: string) => void
  nightShift?: NightShiftConfig
  children: React.ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DayContextMenu({
  date,
  mark,
  onSetMark,
  workWindow,
  onSetWorkWindow,
  onDeleteWorkWindow,
  nightShift,
  children,
}: DayContextMenuProps) {
  const store = usePortalStoreContext()

  const today = getLocalDate()
  const isFuture = date > today
  const isCached = !!store.cache[date]
  const isPermanent = store.cache[date]?.permanent ?? false
  const isConnected = store.connected

  // Custom work window dialog state
  const [customOpen, setCustomOpen] = useState(false)
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleMarkChange(value: string) {
    onSetMark(date, value === "" ? null : (value as DayMark))
  }

  async function handleRefresh() {
    await store.refreshDay(date, true)
  }

  async function handleInvalidate() {
    await store.invalidateDay(date)
  }

  function handleWorkWindowChange(value: string) {
    if (value === "default") {
      onDeleteWorkWindow?.(date)
    } else if (value === "disabled") {
      onSetWorkWindow?.(date, "", "", "disabled")
    } else if (value === "nightshift" && nightShift) {
      onSetWorkWindow?.(date, nightShift.start, nightShift.end, "nightshift")
    } else if (value === "manual") {
      setCustomStart(workWindow?.start_time || "09:00")
      setCustomEnd(workWindow?.end_time || "21:30")
      setCustomOpen(true)
    }
  }

  const customValid = !!customStart && !!customEnd && customStart !== customEnd

  function handleCustomSave() {
    if (customValid) {
      onSetWorkWindow?.(date, customStart, customEnd, "manual")
    }
    setCustomOpen(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

        <ContextMenuContent className="min-w-52">
          {/* ── Date header ── */}
          <ContextMenuLabel className="flex flex-col gap-0.5 px-2.5 py-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              Day
            </span>
            <span className="text-xs font-semibold text-foreground">
              {formatDayHeader(date)}
            </span>
          </ContextMenuLabel>

          <ContextMenuSeparator />

          {/* ── Mark as ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2.5">
              <span className="flex items-center gap-2">
                {mark ? (
                  <span
                    className={`inline-block size-2 rounded-full ${
                      MARK_DEFS.find((m) => m.value === mark)?.dotClass ??
                      "bg-muted"
                    }`}
                  />
                ) : (
                  <span className="inline-block size-2 rounded-full bg-emerald-500/60" />
                )}
                Mark as
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={mark ?? ""}
                onValueChange={handleMarkChange}
              >
                {/* Clear / working day */}
                <ContextMenuRadioItem value="" className="gap-2.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-500/60" />
                  Working Day
                </ContextMenuRadioItem>

                <ContextMenuSeparator />

                {/* All mark types from registry */}
                {MARK_DEFS.map(({ value, label, dotClass }) => (
                  <ContextMenuRadioItem
                    key={value}
                    value={value}
                    className="gap-2.5"
                  >
                    <span
                      className={`inline-block size-2 rounded-full ${dotClass}`}
                    />
                    {label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          {/* ── Data ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2.5">
              <HugeiconsIcon
                icon={Database02Icon}
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              Data
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {/* Refresh cache */}
              <ContextMenuItem
                className="gap-2.5"
                disabled={!isConnected || isFuture || isPermanent}
                onClick={handleRefresh}
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  size={14}
                  className="shrink-0"
                />
                Refresh cache
                {isPermanent && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    permanent
                  </span>
                )}
              </ContextMenuItem>

              {/* Invalidate cache */}
              <ContextMenuItem
                className="gap-2.5"
                variant="destructive"
                disabled={!isCached}
                onClick={handleInvalidate}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={14}
                  className="shrink-0"
                />
                Invalidate cache
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* ── Work Window ── */}
          {onSetWorkWindow && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-2.5">
                  <HugeiconsIcon
                    icon={Time04Icon}
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                  Work Window
                  {workWindow && (
                    <span className="ml-auto text-[10px] text-muted-foreground/50">
                      {workWindow.source === "disabled"
                        ? "all entries"
                        : `${workWindow.start_time}–${workWindow.end_time}`}
                    </span>
                  )}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuRadioGroup
                    value={resolveRadioValue(workWindow)}
                    onValueChange={handleWorkWindowChange}
                  >
                    <ContextMenuRadioItem value="default" className="gap-2.5">
                      Default
                    </ContextMenuRadioItem>

                    {nightShift?.enabled && (
                      <>
                        <ContextMenuRadioItem
                          value="nightshift"
                          className="gap-2.5"
                        >
                          Night Shift
                        </ContextMenuRadioItem>
                      </>
                    )}

                    <ContextMenuRadioItem value="manual" className="gap-2.5">
                      Custom
                    </ContextMenuRadioItem>

                    <ContextMenuSeparator />

                    <ContextMenuRadioItem value="disabled" className="gap-2.5">
                      Disable this Day
                    </ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* ── Custom work window dialog ── */}
      <AlertDialog open={customOpen} onOpenChange={setCustomOpen}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Custom Work Window
            </AlertDialogTitle>
            <p className="text-xs text-muted-foreground">
              Set a custom time range for {formatDayHeader(date)}
            </p>
          </AlertDialogHeader>

          <div className="flex items-center gap-3 py-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Start
              </label>
              <Input
                type="time"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <span className="mt-5 text-xs text-muted-foreground/40">to</span>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                End
              </label>
              <Input
                type="time"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCustomSave}
              disabled={!customValid}
              className="h-8 text-xs"
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
