import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Globe02Icon,
  Clock01Icon,
  Notification01Icon,
  KeyboardIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

interface StepCompleteProps {
  portalConnected: boolean
  workHoursSet: boolean
  notificationsEnabled: boolean
  hotkeyEnabled: boolean
}

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
      <span
        className={cn(
          "text-xs",
          done ? "text-foreground" : "text-muted-foreground/40"
        )}
      >
        {label}
      </span>
      {done && (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={12}
          className="ml-auto text-emerald-400/70"
        />
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
        <ConfigItem
          icon={Globe02Icon}
          label="HRMS Portal"
          done={portalConnected}
        />
        <ConfigItem icon={Clock01Icon} label="Work Hours" done={workHoursSet} />
        <ConfigItem
          icon={Notification01Icon}
          label="Notifications"
          done={notificationsEnabled}
        />
        <ConfigItem
          icon={KeyboardIcon}
          label="Global Hotkey"
          done={hotkeyEnabled}
        />
      </div>

      <div className="space-y-2">
        <p>
          Press{" "}
          <KbdGroup>
            <Kbd>Shift</Kbd>
            <span>+</span>
            <Kbd>?</Kbd>
          </KbdGroup>{" "}
          anytime to view the list of keyboard shortcuts or open app manual.
        </p>
      </div>

      {!portalConnected && (
        <p className="text-center text-[11px] text-muted-foreground/50">
          Connect to HRMS Portal later from the Portal section to unlock full
          insights.
        </p>
      )}
    </div>
  )
}
