import { useState, useEffect, useCallback, useRef } from "react"
import type { PortalData, PortalEntry, HrmsConnectionStatus } from "@/lib/types"

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

export function usePortalData() {
  const [hrmsStatus, setHrmsStatus] = useState<HrmsConnectionStatus>({
    connected: false,
    userName: null,
    userId: null,
    hasCredentials: false,
  })
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (isElectron) {
      const status = await window.electronAPI.hrmsGetStatus()
      setHrmsStatus(status)
      return status
    }
    const status = getMockHrmsStatus()
    setHrmsStatus(status)
    return status
  }, [])

  const fetchHours = useCallback(async () => {
    try {
      let data: PortalData
      if (isElectron) {
        data = await window.electronAPI.hrmsGetHours()
      } else {
        data = getMockPortalData()
      }
      setPortalData(data)
      setError(data.success ? null : data.message || "Failed to fetch portal data")
    } catch {
      setError("Failed to connect to portal")
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const status = await fetchStatus()
      if (status.connected || status.hasCredentials) {
        await fetchHours()
        // Re-fetch status: fetchHours may have auto-logged in (token was gone after restart)
        await fetchStatus()
        setLastRefreshed(new Date())
      }
    } finally {
      setLoading(false)
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
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 5 minutes when connected
  useEffect(() => {
    if (hrmsStatus.connected || hrmsStatus.hasCredentials) {
      refreshIntervalRef.current = setInterval(fetchHours, 5 * 60 * 1000)
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [hrmsStatus.connected, hrmsStatus.hasCredentials, fetchHours])

  // Live timer: update active session every minute
  useEffect(() => {
    if (!portalData?.isCurrentlyIn) return
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

  return { hrmsStatus, portalData, loading, error, lastRefreshed, login, logout, refresh }
}
