import { useState, useEffect, useCallback, useRef } from "react"
import type { WeekDaySummary } from "@/lib/types"
import { getMonthRange, getWeekdaysInMonth } from "@/lib/month-utils"
import { getLocalDate } from "@/lib/week-utils"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

function getMockMonthSummaries(dates: string[]): WeekDaySummary[] {
  return dates.map((date) => ({
    date,
    totalSeconds: Math.floor(21600 + Math.random() * 10800),
    eventCount: Math.floor(2 + Math.random() * 6),
    missPunchCount: Math.random() > 0.9 ? 1 : 0,
  }))
}

export function useMonthData(yearMonth: string) {
  const [summaries, setSummaries] = useState<WeekDaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today = getLocalDate()
  const { start, end } = getMonthRange(yearMonth)
  const monthIncludesToday = start <= today && end >= today

  const refresh = useCallback(async () => {
    try {
      const dates = getWeekdaysInMonth(yearMonth, today)
      if (dates.length === 0) {
        setSummaries([])
        return
      }
      if (isElectron) {
        const raw = await window.electronAPI.hrmsGetWeekHours(dates)
        setSummaries(
          raw.map(
            (r: {
              date: string
              totalMinutes: number
              missPunchCount: number
              sessionCount: number
            }) => ({
              date: r.date,
              totalSeconds: r.totalMinutes * 60,
              eventCount: r.sessionCount,
              missPunchCount: r.missPunchCount,
            })
          )
        )
      } else {
        setSummaries(getMockMonthSummaries(dates))
      }
    } finally {
      setLoading(false)
    }
  }, [yearMonth, today])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!monthIncludesToday) return
    refreshRef.current = setInterval(refresh, 5 * 60 * 1000)
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [monthIncludesToday, refresh])

  return { summaries, loading, refresh }
}
