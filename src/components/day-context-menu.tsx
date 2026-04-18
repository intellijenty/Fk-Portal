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
import { usePortalStoreContext } from "@/contexts/portal-store"
import { getLocalDate, type DayMark } from "@/lib/week-utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Database02Icon, RefreshIcon, Delete02Icon } from "@hugeicons/core-free-icons"

// ── Mark type registry ────────────────────────────────────────────────────────
// Add new mark types here; the submenu renders from this list automatically.

interface MarkDef {
  value: DayMark
  label: string
  dotClass: string
}

const MARK_DEFS: MarkDef[] = [
  { value: "mp", label: "Miss Punch",  dotClass: "bg-red-500/70" },
  { value: "fl", label: "Full Leave",  dotClass: "bg-violet-500/70" },
  { value: "hl", label: "Half Leave",  dotClass: "bg-sky-500/70" },
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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DayContextMenuProps {
  date: string
  mark: DayMark | undefined
  onSetMark: (date: string, mark: DayMark | null) => void
  children: React.ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DayContextMenu({
  date,
  mark,
  onSetMark,
  children,
}: DayContextMenuProps) {
  const store = usePortalStoreContext()

  const today = getLocalDate()
  const isFuture = date > today
  const isCached = !!store.cache[date]
  const isPermanent = store.cache[date]?.permanent ?? false
  const isConnected = store.connected

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent className="min-w-52">
        {/* ── Date header ── */}
        <ContextMenuLabel className="flex flex-col gap-0.5 px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Day
          </span>
          <span className="text-sm font-semibold text-foreground">
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
                    MARK_DEFS.find((m) => m.value === mark)?.dotClass ?? "bg-muted"
                  }`}
                />
              ) : (
                <span className="inline-block size-2 rounded-full bg-emerald-500/60" />
              )}
              Mark as
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={mark ?? ""} onValueChange={handleMarkChange}>
              {/* Clear / working day */}
              <ContextMenuRadioItem value="" className="gap-2.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500/60" />
                Working Day
              </ContextMenuRadioItem>

              <ContextMenuSeparator />

              {/* All mark types from registry */}
              {MARK_DEFS.map(({ value, label, dotClass }) => (
                <ContextMenuRadioItem key={value} value={value} className="gap-2.5">
                  <span className={`inline-block size-2 rounded-full ${dotClass}`} />
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
            <HugeiconsIcon icon={Database02Icon} size={14} className="shrink-0 text-muted-foreground" />
            Data
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {/* Refresh cache */}
            <ContextMenuItem
              className="gap-2.5"
              disabled={!isConnected || isFuture || isPermanent}
              onClick={handleRefresh}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} className="shrink-0" />
              Refresh cache
              {isPermanent && (
                <span className="ml-auto text-[10px] text-muted-foreground/50">permanent</span>
              )}
            </ContextMenuItem>

            {/* Invalidate cache */}
            <ContextMenuItem
              className="gap-2.5"
              variant="destructive"
              disabled={!isCached}
              onClick={handleInvalidate}
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} className="shrink-0" />
              Invalidate cache
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}
