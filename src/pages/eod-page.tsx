import { HugeiconsIcon } from "@hugeicons/react"
import { Edit01Icon } from "@hugeicons/core-free-icons"

export function EodPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/40">
        <HugeiconsIcon
          icon={Edit01Icon}
          size={26}
          className="text-muted-foreground/50"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/70">EOD Draft</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">Coming soon</p>
      </div>
    </div>
  )
}
