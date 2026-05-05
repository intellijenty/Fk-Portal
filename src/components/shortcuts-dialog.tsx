import { useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { SHORTCUTS, type AppShortcut, type ShortcutId } from "@/lib/shortcuts"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon } from "@hugeicons/core-free-icons"
import { Button } from "./ui/button"

const KEY_DISPLAY: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Escape: "Esc",
  "?": "?",
}

function shortcutKeys(s: AppShortcut): string[] {
  const keys: string[] = []
  if (s.modifiers?.ctrl) keys.push("Ctrl")
  if (s.modifiers?.alt) keys.push("Alt")
  if (s.modifiers?.shift) keys.push("Shift")
  if (s.modifiers?.meta) keys.push("⌘")
  const raw = s.defaultKey
  keys.push(KEY_DISPLAY[raw] ?? raw.toUpperCase())
  return keys
}

const GROUPS: { label: string; ids: string[] }[] = [
  {
    label: "Navigation",
    ids: ["day-prev", "day-next", "go-today", "week-prev", "week-next"],
  },
  {
    label: "Window",
    ids: [
      "toggle-window-size",
      "open-settings",
      "open-shortcuts",
      "close-window",
    ],
  },
]

const SHORTCUT_BY_ID = new Map(SHORTCUTS.map((s) => [s.id, s]))

function ShortcutRow({ shortcut }: { shortcut: AppShortcut }) {
  const keys = shortcutKeys(shortcut)
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground/80">{shortcut.label}</span>
      <KbdGroup>
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </KbdGroup>
    </div>
  )
}

function ShortcutsDialogContent() {
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <DialogTitle className="text-base font-semibold tracking-tight">
          Keyboard Shortcuts
        </DialogTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          These shortcuts only work when the app window is focused.
        </p>
      </div>

      <Separator />

      {/* Groups */}
      <div className="space-y-5 px-6 py-4">
        {GROUPS.map((group) => {
          const shortcuts = group.ids
            .map((id) => SHORTCUT_BY_ID.get(id as ShortcutId))
            .filter(Boolean) as AppShortcut[]
          return (
            <div key={group.label}>
              <p className="mb-1 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                {group.label}
              </p>
              <div className="divide-y divide-border/40">
                {shortcuts.map((s) => (
                  <ShortcutRow key={s.id} shortcut={s} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Separator />

      {/* Footer — manual link */}
      <div className="px-6 py-3">
        <Button
          variant={"link"}
          size={"xs"}
          className="text-muted-foreground"
          onClick={() => {
            const url = "https://traccia.notion.site/manual"
            if (
              typeof window !== "undefined" &&
              window.electronAPI?.openExternal
            ) {
              window.electronAPI.openExternal(url)
            } else {
              window.open(url, "_blank")
            }
          }}
        >
          <HugeiconsIcon icon={LinkSquare02Icon} size={13} className="mr-1" />
          Open Manual
        </Button>
      </div>
    </div>
  )
}

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  useEffect(() => {
    function handleOpen() {
      onOpenChange(true)
    }
    window.addEventListener("traccia:open-shortcuts", handleOpen)
    return () =>
      window.removeEventListener("traccia:open-shortcuts", handleOpen)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-sm gap-0 overflow-hidden p-0"
      >
        <ShortcutsDialogContent />
      </DialogContent>
    </Dialog>
  )
}

/** Standalone trigger button — dispatches custom event so ShortcutsDialog opens from anywhere. */
export function ShortcutsDialogTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("traccia:open-shortcuts"))
      }
      className={className}
      aria-label="Open keyboard shortcuts"
    >
      ?
    </button>
  )
}
