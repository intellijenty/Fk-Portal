import { Card, CardContent } from "@/components/ui/card"

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${String(m).padStart(2, "0")}m`
}

function formatCompletionTime(remainingMinutes: number): string {
  const completionDate = new Date(Date.now() + remainingMinutes * 60 * 1000)
  return completionDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

interface PortalTotalCardProps {
  totalMinutes: number
  isIn: boolean
  targetMinutes?: number
}

export function PortalTotalCard({
  totalMinutes,
  isIn,
  targetMinutes = 480,
}: PortalTotalCardProps) {
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes)
  const percentage = Math.min(
    100,
    Math.round((totalMinutes / targetMinutes) * 1000) / 10
  )
  const completed = remainingMinutes === 0

  return (
    <Card className="border-0 bg-muted/50">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Portal Completion
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
          {isIn ? formatCompletionTime(remainingMinutes) : formatHoursMinutes(totalMinutes)}
        </p>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0h</span>
            <span>{percentage}%</span>
            <span>{Math.floor(targetMinutes / 60)}h</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {completed ? (
            <span className="text-blue-400">Target reached!</span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {formatHoursMinutes(remainingMinutes)}
              </span>
              {" remaining"}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
