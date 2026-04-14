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

const TABS = [
  { value: "general", label: "General", icon: Settings02Icon },
  { value: "data-controls", label: "Data Controls", icon: Database02Icon },
  { value: "accessibility", label: "Accessibility", icon: UniversalAccessCircleIcon },
] as const

type TabValue = (typeof TABS)[number]["value"]

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
        className="w-full max-w-[80vw] sm:max-w-3xl gap-0 overflow-hidden p-0"
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
            {/* Sidebar header */}
            <div className="px-4 pt-5 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Settings
              </p>
            </div>

            {/* Tab nav */}
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
                    // Override the line variant's right-side indicator
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
                {/* Panel header */}
                <div className="mb-5">
                  <h2 className="text-sm font-semibold">{label}</h2>
                  <Separator className="mt-3" />
                </div>

                {/* Empty state placeholder */}
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-muted-foreground/40">
                    No settings here yet
                  </p>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
