import { PortalStatusCard } from "./portal-status-card"
import { PortalTotalCard } from "./portal-total-card"
import { PortalLog } from "./portal-log"
import { HrmsLogin } from "./hrms-login"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePortalData } from "@/hooks/use-portal-data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon } from "@hugeicons/core-free-icons"

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

interface PortalSectionProps {
  date?: string
  variant?: "default" | "wide"
}

export function PortalSection({ date, variant = "default" }: PortalSectionProps) {
  const {
    hrmsStatus,
    portalData,
    loading,
    error,
    lastRefreshed,
    login,
    logout,
    refresh,
  } = usePortalData(date)

  // Show controls when connected OR when credentials exist (auto-reconnecting after restart)
  const showControls = hrmsStatus.connected || hrmsStatus.hasCredentials

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Portal
        </h2>
        <div className="flex items-center gap-2">
          {showControls && hrmsStatus.userName && (
            <span className="text-xs text-muted-foreground">
              {hrmsStatus.userName}
            </span>
          )}
          {showControls && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={refresh}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  ↻
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {lastRefreshed
                  ? `Last updated: ${formatTime(lastRefreshed)}`
                  : "Click to refresh"}
              </TooltipContent>
            </Tooltip>
          )}
          <HrmsLogin
            onLogin={login}
            onLogout={logout}
            connected={showControls}
          />
        </div>
      </div>

      {/* Not connected — compact (narrow layout) */}
      {!showControls && variant === "default" && (
        <div className="rounded-lg border border-dashed border-border/50 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Connect to HRMS portal to view punch data
          </p>
        </div>
      )}

      {/* Not connected — wide layout blur overlay */}
      {!showControls && variant === "wide" && (
        <div className="relative overflow-hidden rounded-xl">
          {/* Ghost skeleton — blurred background */}
          <div className="pointer-events-none select-none space-y-3 opacity-40 blur-[2px]">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-[72px] rounded-lg bg-muted/60" />
              <div className="h-[72px] rounded-lg bg-muted/60" />
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-muted-foreground/20" />
              <div className="space-y-1.5 pt-1">
                {[0.85, 0.65, 0.75, 0.55].map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                  >
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/15" />
                    <div
                      className="h-2 rounded-full bg-muted-foreground/15"
                      style={{ width: `${w * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/75 backdrop-blur-[3px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/40">
              <HugeiconsIcon
                icon={Globe02Icon}
                size={24}
                className="text-muted-foreground/70"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/80">
                HRMS Portal
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign in to view attendance & punch data
              </p>
            </div>
            <HrmsLogin
              onLogin={login}
              onLogout={logout}
              connected={false}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !portalData && showControls && (
        <div className="py-4 text-center">
          <p className="animate-pulse text-xs text-muted-foreground">
            Loading portal data...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !portalData?.success && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Connected with data */}
      {portalData?.success && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <PortalStatusCard
              isIn={portalData.isCurrentlyIn}
              lastInTime={portalData.lastInTime}
              totalMinutes={portalData.totalMinutes}
            />
            <PortalTotalCard
              totalMinutes={portalData.totalMinutes}
              isIn={portalData.isCurrentlyIn}
            />
          </div>
          <PortalLog entries={portalData.entries} />
        </>
      )}
    </div>
  )
}
