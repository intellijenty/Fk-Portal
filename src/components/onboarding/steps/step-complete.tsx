import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Globe02Icon, Clock01Icon, Notification01Icon, KeyboardIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface StepCompleteProps {
  portalConnected: boolean
  workHoursSet: boolean
  notificationsEnabled: boolean
  hotkeyEnabled: boolean
}

const SHORTCUTS = [
  { key: "F", desc: "Toggle compact / full view" },
  { key: "S", desc: "Open settings" },
  { key: "← →", desc: "Navigate days" },
  { key: "↑ ↓", desc: "Jump weeks (wide view)" },
  { key: "T", desc: "Jump to today" },
  { key: "Esc", desc: "Hide window" },
]

function ConfigItem({
  icon,
  label,
  done,
}: {
  icon: React.ComponentType
  label: string
  done: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <HugeiconsIcon
        icon={icon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
        size={14}
        className={done ? "text-emerald-400" : "text-muted-foreground/30"}
      />
      <span className={cn("text-xs", done ? "text-foreground" : "text-muted-foreground/40")}>
        {label}
      </span>
      {done && (
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} className="ml-auto text-emerald-400/70" />
      )}
    </div>
  )
}

export function StepComplete({
  portalConnected,
  workHoursSet,
  notificationsEnabled,
  hotkeyEnabled,
}: StepCompleteProps) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-2xl font-bold tracking-tight">You're all set 🎉</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Traccia is ready. Here's what you configured:
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3.5">
        <ConfigItem icon={Globe02Icon} label="HRMS Portal" done={portalConnected} />
        <ConfigItem icon={Clock01Icon} label="Work Hours" done={workHoursSet} />
        <ConfigItem icon={Notification01Icon} label="Notifications" done={notificationsEnabled} />
        <ConfigItem icon={KeyboardIcon} label="Global Hotkey" done={hotkeyEnabled} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Keyboard Shortcuts
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border/50 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
                {key}
              </kbd>
              <span className="text-[11px] text-muted-foreground/70 truncate">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {!portalConnected && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Connect to HRMS Portal later from the Portal section to unlock full insights.
        </p>
      )}
    </div>
  )
}
