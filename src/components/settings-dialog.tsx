import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Settings01Icon,
  Settings02Icon,
  Database02Icon,
  Cancel01Icon,
  UniversalAccessCircleIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { HotkeyRecorder } from "@/components/hotkey-recorder"
import { useHotkeySettings } from "@/hooks/use-hotkey-settings"

const TABS = [
  { value: "general", label: "General", icon: Settings02Icon },
  { value: "data-controls", label: "Data Controls", icon: Database02Icon },
  { value: "accessibility", label: "Accessibility", icon: UniversalAccessCircleIcon },
] as const

type TabValue = (typeof TABS)[number]["value"]

// ── Accessibility tab content ─────────────────────────────────────────────────

function AccessibilityTab() {
  const { settings, save, loading } = useHotkeySettings()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground/50">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* App Hotkey section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            App Hotkey
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Quickly show or hide the app window from anywhere
          </p>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3.5 py-3">
          <div>
            <p className="text-xs font-medium">Enable hotkey</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/60">
              Register a global keyboard shortcut
            </p>
          </div>
          <button
            type="button"
            onClick={() => save({ ...settings, enabled: !settings.enabled })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              settings.enabled ? "bg-primary" : "bg-muted"
            )}
            role="switch"
            aria-checked={settings.enabled}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                settings.enabled ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Hotkey combination */}
        <div
          className={cn(
            "space-y-2 transition-opacity",
            !settings.enabled && "pointer-events-none opacity-40"
          )}
        >
          <label className="text-xs font-medium">Shortcut</label>
          <HotkeyRecorder
            value={settings.combo}
            defaultValue="Alt+Space"
            requireModifier
            onChange={(combo) => save({ ...settings, combo })}
          />
          <p className="text-[11px] text-muted-foreground/50">
            Click the shortcut to record a new one. Modifier key required.
          </p>
        </div>

        {/* Mode selector */}
        <div
          className={cn(
            "space-y-2 transition-opacity",
            !settings.enabled && "pointer-events-none opacity-40"
          )}
        >
          <label className="text-xs font-medium">Behavior</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  mode: "press" as const,
                  title: "Press to Display",
                  desc: "Press once to show, press again to hide",
                },
                {
                  mode: "push" as const,
                  title: "Push to Display",
                  desc: "Hold the shortcut to show, release to hide",
                },
              ] as const
            ).map(({ mode, title, desc }) => (
              <button
                key={mode}
                type="button"
                onClick={() => save({ ...settings, mode })}
                className={cn(
                  "flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors",
                  settings.mode === mode
                    ? "border-primary/40 bg-primary/8 text-foreground"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70 hover:bg-muted/40"
                )}
              >
                <span className="text-[11px] font-semibold">{title}</span>
                <span className="mt-0.5 text-[10px] leading-tight opacity-70">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>("general")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Open settings"
      >
        <HugeiconsIcon icon={Settings01Icon} size={16} />
      </Button>

      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[80vw] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="flex h-125"
        >
          {/* ── Left sidebar ── */}
          <aside className="flex w-48 shrink-0 flex-col border-r border-border/50 bg-muted/20">
            <div className="px-4 pt-5 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Settings
              </p>
            </div>

            <TabsList
              variant="line"
              className="h-auto w-full flex-col items-stretch gap-0.5 bg-transparent px-2"
            >
              {TABS.map(({ value, label, icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    "group/tab h-9 justify-start gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                    "text-muted-foreground/70 hover:text-foreground",
                    "data-active:bg-background/80 data-active:text-foreground dark:data-active:bg-input/40",
                    "after:hidden"
                  )}
                >
                  <HugeiconsIcon
                    icon={icon}
                    size={15}
                    className="shrink-0 opacity-70 group-data-active/tab:opacity-100"
                  />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>

          {/* ── Right content ── */}
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Close button */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 z-10 bg-secondary/60 text-muted-foreground hover:text-foreground"
                aria-label="Close settings"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </Button>
            </DialogClose>

            {TABS.map(({ value, label }) => (
              <TabsContent
                key={value}
                value={value}
                className="mt-0 flex h-full flex-col overflow-y-auto px-7 pt-6 pb-7"
              >
                <div className="mb-5">
                  <h2 className="text-sm font-semibold">{label}</h2>
                  <Separator className="mt-3" />
                </div>

                {value === "accessibility" ? (
                  <AccessibilityTab />
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-xs text-muted-foreground/40">
                      No settings here yet
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
