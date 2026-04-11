import { PortalStatusCard } from "./portal-status-card"
import { PortalTotalCard } from "./portal-total-card"
import { PortalLog } from "./portal-log"
import { HrmsLogin } from "./hrms-login"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePortalData } from "@/hooks/use-portal-data"

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
}

export function PortalSection({ date }: PortalSectionProps) {
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

      {/* Not connected — no credentials */}
      {!showControls && (
        <div className="rounded-lg border border-dashed border-border/50 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Connect to HRMS portal to view punch data
          </p>
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
