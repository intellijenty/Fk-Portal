import { Card, CardContent } from "@/components/ui/card"

function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

function formatCompletionTime(remainingSeconds: number): string {
  const completionDate = new Date(Date.now() + remainingSeconds * 1000)
  return completionDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

interface TotalCardProps {
  totalSeconds: number
  workingSeconds?: number
  isIn: boolean
  targetMinutes?: number
}

export function TotalCard({
  totalSeconds,
  workingSeconds,
  isIn,
  targetMinutes = 480,
}: TotalCardProps) {
  const displaySeconds = workingSeconds ?? totalSeconds
  const targetSeconds = targetMinutes * 60
  const remainingSeconds = Math.max(0, targetSeconds - displaySeconds)
  const percentage = Math.min(
    100,
    Math.round((displaySeconds / targetSeconds) * 1000) / 10
  )
  const completed = remainingSeconds === 0

  return (
    <Card className="border-0 bg-muted/50">
      <CardContent className="p-5">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Estimated Completion
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums">
          {formatCompletionTime(remainingSeconds)}
        </p>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0h</span>
            <span>{percentage}%</span>
            <span>{Math.floor(targetMinutes / 60)}h</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {completed ? (
            <span className="text-emerald-400">Target reached!</span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {formatHoursMinutes(remainingSeconds)}
              </span>
              {" remaining"}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
