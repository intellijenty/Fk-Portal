import { usePortalStatusContext } from "@/contexts/portal-status"
import type { HrmsConnectionStatus, PortalData } from "@/lib/types"
import { useCallback, useEffect, useRef, useState } from "react"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

// ── Mock data for browser dev mode ──

function getMockPortalData(): PortalData {
  const today = new Date()
  const base = new Date(today)
  base.setHours(9, 0, 0, 0)

  const activeInTime = new Date(base.getTime() + 2.5 * 3600000)
  const activeMinutes = Math.max(
    0,
    Math.floor((Date.now() - activeInTime.getTime()) / 60000)
  )

  return {
    success: true,
    entries: [
      {
        empid: 132,
        logdate: base.toISOString(),
        intime: base.toISOString(),
        outtime: new Date(base.getTime() + 21 * 60000).toISOString(),
        workingmins: 21,
        ismanual: 0,
      },
      {
        empid: 132,
        logdate: base.toISOString(),
        intime: new Date(base.getTime() + 24 * 60000).toISOString(),
        outtime: new Date(base.getTime() + 2 * 3600000).toISOString(),
        workingmins: 96,
        ismanual: 0,
      },
      {
        empid: 132,
        logdate: base.toISOString(),
        intime: activeInTime.toISOString(),
        outtime: null,
        workingmins: null,
        ismanual: 0,
      },
    ],
    totalMinutes: 117 + activeMinutes,
    isCurrentlyIn: true,
    lastInTime: activeInTime.toISOString(),
    activeSessionMinutes: activeMinutes,
  }
}

function getMockHrmsStatus(): HrmsConnectionStatus {
  return {
    connected: true,
    userName: "John Doe",
    userId: 132,
    hasCredentials: true,
  }
}

// ── Hook ──

export function usePortalData(date?: string) {
  const targetDate = date || new Date().toLocaleDateString("en-CA")
  const isToday = targetDate === new Date().toLocaleDateString("en-CA")
  const { setPortalConnected } = usePortalStatusContext()
  const [hrmsStatus, setHrmsStatus] = useState<HrmsConnectionStatus>({
    connected: false,
    userName: null,
    userId: null,
    hasCredentials: false,
  })
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const lastRefreshedRef = useRef<Date | null>(null)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasDataRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    if (isElectron) {
      const status = await window.electronAPI.hrmsGetStatus()
      setHrmsStatus(status)
      setPortalConnected(status.connected || status.hasCredentials)
      return status
    }
    const status = getMockHrmsStatus()
    setHrmsStatus(status)
    setPortalConnected(status.connected || status.hasCredentials)
    return status
  }, [setPortalConnected])

  const fetchHours = useCallback(async () => {
    try {
      let data: PortalData
      if (isElectron) {
        const apiDate = `${targetDate}T00:00:00.000Z`
        data = await window.electronAPI.hrmsGetHours(apiDate)
      } else {
        data = getMockPortalData()
      }
      hasDataRef.current = true
      setPortalData(data)
      setError(data.success ? null : data.message || "Failed to fetch portal data")
    } catch {
      setError("Failed to connect to portal")
    }
  }, [targetDate])

  const THROTTLE_MS = 60_000 // 1 minute

  const refresh = useCallback(async (opts?: { throttle?: boolean }) => {
    // Throttle check — skip if last refresh was less than 1 minute ago
    if (opts?.throttle && lastRefreshedRef.current) {
      if (Date.now() - lastRefreshedRef.current.getTime() < THROTTLE_MS) return
    }

    // Use syncing (not loading) when data is already displayed
    if (hasDataRef.current) {
      setSyncing(true)
    } else {
      setLoading(true)
    }

    try {
      const status = await fetchStatus()
      if (status.connected || status.hasCredentials) {
        await fetchHours()
        await fetchStatus()
        const now = new Date()
        lastRefreshedRef.current = now
        setLastRefreshed(now)
      }
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [fetchStatus, fetchHours])

  const login = useCallback(
    async (
      email: string,
      password: string,
      baseUrl?: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (isElectron) {
        const result = await window.electronAPI.hrmsLogin(
          email,
          password,
          baseUrl
        )
        if (result.success) {
          await refresh()
        }
        return result
      }
      // Mock success in dev
      setHrmsStatus(getMockHrmsStatus())
      setPortalData(getMockPortalData())
      return { success: true }
    },
    [refresh]
  )

  const logout = useCallback(async () => {
    if (isElectron) {
      await window.electronAPI.hrmsLogout()
    }
    setHrmsStatus({
      connected: false,
      userName: null,
      userId: null,
      hasCredentials: false,
    })
    setPortalData(null)
    setError(null)
    setPortalConnected(false)
  }, [setPortalConnected])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 5 minutes — only for today
  useEffect(() => {
    if (!isToday) return
    if (hrmsStatus.connected || hrmsStatus.hasCredentials) {
      refreshIntervalRef.current = setInterval(fetchHours, 5 * 60 * 1000)
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [isToday, hrmsStatus.connected, hrmsStatus.hasCredentials, fetchHours])

  // Sync on window focus — only for today, only when connected, throttled to 1 min
  useEffect(() => {
    if (!isToday) return
    const handleFocus = () => {
      if (hrmsStatus.connected || hrmsStatus.hasCredentials) {
        refresh({ throttle: true })
      }
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [isToday, hrmsStatus.connected, hrmsStatus.hasCredentials, refresh])

  // Live timer: only for today
  useEffect(() => {
    if (!isToday || !portalData?.isCurrentlyIn) return
    const interval = setInterval(() => {
      setPortalData((prev) => {
        if (!prev || !prev.isCurrentlyIn || !prev.lastInTime) return prev
        const newActive = Math.floor(
          (Date.now() - new Date(prev.lastInTime).getTime()) / 60000
        )
        const diff = newActive - prev.activeSessionMinutes
        if (diff <= 0) return prev
        return {
          ...prev,
          activeSessionMinutes: newActive,
          totalMinutes: prev.totalMinutes + diff,
        }
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [portalData?.isCurrentlyIn])

  return { hrmsStatus, portalData, loading, syncing, error, lastRefreshed, login, logout, refresh }
}
