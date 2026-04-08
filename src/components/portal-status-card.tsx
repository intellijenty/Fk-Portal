import { Card, CardContent } from "@/components/ui/card"

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${String(m).padStart(2, "0")}m`
}

interface PortalStatusCardProps {
  isIn: boolean
  lastInTime: string | null
  totalMinutes: number
}

export function PortalStatusCard({
  isIn,
  lastInTime,
  totalMinutes,
}: PortalStatusCardProps) {
  return (
    <Card
      className={`relative overflow-hidden border-0 ${
        isIn
          ? "bg-blue-950/80 text-blue-50"
          : "bg-muted/50 text-muted-foreground"
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-80">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isIn
                ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]"
                : "bg-muted-foreground/50"
            }`}
          />
          Portal
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {isIn ? "CHECKED IN" : "CHECKED OUT"}
        </div>
        {isIn && lastInTime && (
          <p className="mt-1 text-sm opacity-70">
            Since {formatTime(lastInTime)}
          </p>
        )}
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs uppercase tracking-wider opacity-60">
            Portal hours
          </p>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {formatHoursMinutes(totalMinutes)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
