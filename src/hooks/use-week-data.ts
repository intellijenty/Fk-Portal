import { useState, useEffect, useCallback, useRef } from "react"
import type { WeekDaySummary } from "@/lib/types"
import { getDaysOfWeek, getLocalDate } from "@/lib/week-utils"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

function getMockWeekSummaries(weekStart: string): WeekDaySummary[] {
  const days = getDaysOfWeek(weekStart)
  const today = getLocalDate()
  return days
    .filter((d) => d <= today)
    .map((date) => ({
      date,
      totalSeconds: Math.floor(21600 + Math.random() * 10800),
      eventCount: Math.floor(2 + Math.random() * 6),
      missPunchCount: Math.random() > 0.8 ? 1 : 0,
    }))
}

export function useWeekData(weekStart: string, weekEnd: string) {
  const [summaries, setSummaries] = useState<WeekDaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today = getLocalDate()
  const weekIncludesToday = weekStart <= today && weekEnd >= today

  const refresh = useCallback(async () => {
    try {
      if (isElectron) {
        const days = getDaysOfWeek(weekStart).filter((d) => d <= today)
        if (days.length === 0) {
          setSummaries([])
          return
        }
        // The IPC returns WeekDayPortalSummary[] from hrms.ts
        const raw = await window.electronAPI.hrmsGetWeekHours(days)
        const mapped: WeekDaySummary[] = raw.map(
          (r: { date: string; totalMinutes: number; missPunchCount: number; sessionCount: number }) => ({
            date: r.date,
            totalSeconds: r.totalMinutes * 60,
            eventCount: r.sessionCount,
            missPunchCount: r.missPunchCount,
          })
        )
        setSummaries(mapped)
      } else {
        setSummaries(getMockWeekSummaries(weekStart))
      }
    } finally {
      setLoading(false)
    }
  }, [weekStart, today])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  // Auto-refresh every 5 min if week includes today
  useEffect(() => {
    if (!weekIncludesToday) return
    refreshRef.current = setInterval(refresh, 5 * 60 * 1000)
    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current)
        refreshRef.current = null
      }
    }
  }, [weekIncludesToday, refresh])

  return { summaries, loading, refresh }
}
