import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Timer02Icon,
  SquareArrowShrink02Icon,
  SquareArrowExpand01Icon,
  RemoveSquareIcon,
  CancelSquareIcon,
  Home01Icon,
  Edit01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { Page } from "@/lib/navigation"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

const DRAG = { WebkitAppRegion: "drag" } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: "no-drag" } as React.CSSProperties

const NAV_TABS: {
  id: Page
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}[] = [
  { id: "home", label: "Home", icon: Home01Icon },
  { id: "eod", label: "EOD Draft", icon: Edit01Icon },
]

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
      className={cn("flex h-full items-stretch", className)}
      style={NO_DRAG}
    >
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
      <span className="text-[13px] font-medium tabular-nums tracking-tight">
        {now.toLocaleString(undefined, { timeStyle: "short" })}
      </span>
    </div>
  )
}

// Sliding pill nav — wide title bar only

function TitleBarNav({
  activePage,
  onPageChange,
}: {
  activePage: Page
  onPageChange: (page: Page) => void
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-[3px]"
      style={{
        ...NO_DRAG,
        background:
          "color-mix(in oklch, var(--color-foreground) 6%, transparent)",
      }}
    >
      {NAV_TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = activePage === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onPageChange(tab.id)}
            className={cn(
              "relative flex h-7 items-center gap-[7px] rounded-full px-3.5 text-[13px] font-medium focus:outline-none",
              isActive
                ? "text-foreground"
                : "text-muted-foreground/70 transition-colors duration-150 hover:text-foreground/80"
            )}
            type="button"
          >
            {isActive && (
              <motion.div
                layoutId="title-bar-active-tab"
                className="absolute inset-0 rounded-full bg-background"
                style={{
                  boxShadow:
                    "0 1px 4px rgba(0,0,0,0.13), 0 0 0 0.5px rgba(0,0,0,0.08)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <HugeiconsIcon
              icon={Icon}
              size={14}
              className="relative z-10 shrink-0"
            />
            <span className="relative z-10 select-none">{tab.label}</span>
          </button>
        )
      })}
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
        "relative flex shrink-0 items-center border-b border-border/50 bg-background/95 select-none transition-opacity duration-300",
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
