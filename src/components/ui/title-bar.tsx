import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Timer02Icon,
  SquareArrowShrink02Icon,
  SquareArrowExpand01Icon,
  RemoveSquareIcon,
  CancelSquareIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { Page } from "@/lib/navigation"
import NavBar from "../nav-bar"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

const DRAG = { WebkitAppRegion: "drag" } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: "no-drag" } as React.CSSProperties

// Window controls

export function WindowControls({ className }: { className?: string }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.windowIsMaximized().then(setIsMaximized)
    const unsubMax = window.electronAPI.onWindowMaximized(setIsMaximized)
    return () => {
      unsubMax()
    }
  }, [])

  if (!isElectron) return null

  return (
    <div className={cn("flex h-full items-stretch", className)} style={NO_DRAG}>
      <button
        title="Minimize"
        onClick={() => window.electronAPI.windowMinimize()}
        className="flex w-11 items-center justify-center text-foreground/50 transition-colors duration-100 hover:bg-muted/70 hover:text-foreground"
      >
        <HugeiconsIcon icon={RemoveSquareIcon} size={17} />
      </button>

      <button
        title={isMaximized ? "Restore" : "Maximize"}
        onClick={() => window.electronAPI.windowMaximizeToggle()}
        className="flex w-11 items-center justify-center text-foreground/50 transition-colors duration-100 hover:bg-muted/70 hover:text-foreground"
      >
        <HugeiconsIcon
          icon={isMaximized ? SquareArrowShrink02Icon : SquareArrowExpand01Icon}
          size={17}
        />
      </button>

      <button
        title="Close"
        onClick={() => window.electronAPI.windowClose()}
        className="flex w-11 items-center justify-center text-foreground/50 transition-colors duration-100 hover:bg-destructive/80 hover:text-white"
      >
        <HugeiconsIcon icon={CancelSquareIcon} size={17} />
      </button>
    </div>
  )
}

export function CurrentDateTime() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1.5 pl-3 text-muted-foreground/80">
      <span className="text-[13px] font-medium tracking-tight">
        {now.toLocaleString("en-GB", { day: "numeric", month: "short" })}
      </span>
      <span className="text-[13px] font-bold opacity-40">&middot;</span>
      <span className="text-[13px] font-medium tracking-tight tabular-nums">
        {now.toLocaleString(undefined, { timeStyle: "short" })}
      </span>
    </div>
  )
}

// NavBar wrapper — wide title bar only

function TitleBarNav({
  activePage,
  onPageChange,
}: {
  activePage: Page
  onPageChange: (page: Page) => void
}) {
  return (
    <div style={NO_DRAG}>
      <NavBar
        activePage={activePage}
        onPageChange={onPageChange}
        stickyBottom={false}
        compact
      />
    </div>
  )
}

// Title bar — two variants

export interface TitleBarProps {
  isWide?: boolean
  activePage?: Page
  onPageChange?: (page: Page) => void
}

export function TitleBar({
  isWide = false,
  activePage = "home",
  onPageChange,
}: TitleBarProps) {
  const [isFocused, setIsFocused] = useState(true)

  useEffect(() => {
    if (!isElectron) return
    const unsubFocus = window.electronAPI.onWindowFocus(setIsFocused)
    return () => {
      unsubFocus()
    }
  }, [])

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center border-b border-border/50 bg-background/95 transition-opacity duration-300 select-none",
        isWide ? "h-11" : "h-10",
        !isFocused && "opacity-40"
      )}
      style={DRAG}
      onDoubleClick={() =>
        isElectron && window.electronAPI.windowMaximizeToggle()
      }
    >
      {/* Left: app mark */}
      <div className="flex items-center gap-2 pl-3.5 text-foreground/80">
        <HugeiconsIcon icon={Timer02Icon} size={17} className="shrink-0" />
        <span className="text-[13px] font-semibold tracking-tight">
          Traccia
        </span>
      </div>

      {/* Narrow: datetime inline */}
      {!isWide && <CurrentDateTime />}

      {/* Flex-grow spacer (pushes window controls right in narrow; left half in wide) */}
      <div className="flex-1" />

      {/* Wide: nav tabs absolutely centered */}
      {isWide && onPageChange && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <TitleBarNav activePage={activePage} onPageChange={onPageChange} />
        </div>
      )}

      {/* Window controls */}
      <WindowControls />
    </div>
  )
}
