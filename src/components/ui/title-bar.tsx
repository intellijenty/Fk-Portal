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
    <div
      className={cn(
        "flex h-full items-stretch transition-opacity duration-200",
        className
      )}
      style={NO_DRAG}
    >
      {/* Minimize */}
      <button
        title="Minimize"
        onClick={() => window.electronAPI.windowMinimize()}
        className="flex w-11 items-center justify-center rounded text-foreground/70 transition-colors duration-100 hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={RemoveSquareIcon} size={18} />
      </button>

      {/* Maximize / Restore */}
      <button
        title={isMaximized ? "Restore" : "Maximize"}
        onClick={() => window.electronAPI.windowMaximizeToggle()}
        className="flex w-11 items-center justify-center rounded text-foreground/70 transition-colors duration-100 hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon
          icon={isMaximized ? SquareArrowShrink02Icon : SquareArrowExpand01Icon}
          size={18}
        />
      </button>

      {/* Close */}
      <button
        title="Close"
        onClick={() => window.electronAPI.windowClose()}
        className="flex w-11 items-center justify-center rounded text-foreground/70 transition-colors duration-100 hover:bg-destructive/80 hover:text-white"
      >
        <HugeiconsIcon icon={CancelSquareIcon} size={18} />
      </button>
    </div>
  )
}

export function CurrentDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex gap-1.5 pl-3 text-muted-foreground font-semibold">
      <span className="text-sm tracking-tight">
        {currentDateTime.toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </span>
      <span className="text-sm font-bold">&middot;</span>
      <span className="text-sm tracking-tighter">
        {currentDateTime.toLocaleString(undefined, {
          timeStyle: "short",
        })}
      </span>
    </div>
  )
}

// Title bar

export function TitleBar() {
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
        "flex h-9 shrink-0 items-center border-b bg-background transition-opacity duration-200 select-none",
        !isFocused && "opacity-50"
      )}
      style={DRAG}
      onDoubleClick={() =>
        isElectron && window.electronAPI.windowMaximizeToggle()
      }
    >
      {/* App mark - left, draggable region */}
      <div className="flex items-center gap-2 pl-3 text-foreground">
        <HugeiconsIcon icon={Timer02Icon} size={17} />
        <span className="font-medium tracking-tight">Traccia</span>
      </div>

      {/* formatted Current date and time */}
      <CurrentDateTime />

      {/* Drag region fills center */}
      <div className="flex-1" />

      {/* Window controls - right */}
      <WindowControls />
    </div>
  )
}
