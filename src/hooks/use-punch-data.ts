import { useState, useEffect, useCallback, useRef } from "react"
import type { PunchEntry, PunchStatus, EntryType } from "@/lib/types"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA") // YYYY-MM-DD
}

// ── Mock store for development outside Electron ──

let mockNextId = 6
let mockEntries: PunchEntry[] = []
let mockInitialized = false

function initMockEntries(): void {
  if (mockInitialized) return
  mockInitialized = true

  const base = new Date()
  base.setHours(9, 0, 0, 0)
  const now = new Date().toISOString()

  mockEntries = [
    { id: 5, timestamp: new Date(base.getTime() + 6 * 3600000).toISOString(), date: getLocalDate(), type: "LOGIN", source: "auto", trigger: "via unlock", notes: null, created_at: now, modified_at: null },
    { id: 4, timestamp: new Date(base.getTime() + 5 * 3600000).toISOString(), date: getLocalDate(), type: "LOGOUT", source: "auto", trigger: "via lock", notes: null, created_at: now, modified_at: null },
    { id: 3, timestamp: new Date(base.getTime() + 3 * 3600000).toISOString(), date: getLocalDate(), type: "LOGIN", source: "auto", trigger: "via unlock", notes: null, created_at: now, modified_at: null },
    { id: 2, timestamp: new Date(base.getTime() + 1 * 3600000).toISOString(), date: getLocalDate(), type: "LOGOUT", source: "auto", trigger: "via lock", notes: null, created_at: now, modified_at: null },
    { id: 1, timestamp: base.toISOString(), date: getLocalDate(), type: "LOGIN", source: "auto", trigger: "via boot", notes: null, created_at: now, modified_at: null },
  ]
}

function getMockEntriesByDate(date: string): PunchEntry[] {
  initMockEntries()
  return mockEntries
    .filter((e) => e.date === date)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

function getMockStatus(): PunchStatus {
  initMockEntries()
  const today = getLocalDate()
  const todayEntries = mockEntries
    .filter((e) => e.date === today)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  const last = todayEntries[todayEntries.length - 1] || null
  const isIn = last?.type === "LOGIN"

  let totalSeconds = 0
  let loginTime: number | null = null
  for (const entry of todayEntries) {
    if (entry.type === "LOGIN") {
      loginTime = new Date(entry.timestamp).getTime()
    } else if (entry.type === "LOGOUT" && loginTime !== null) {
      totalSeconds += (new Date(entry.timestamp).getTime() - loginTime) / 1000
      loginTime = null
    }
  }
  if (loginTime !== null) {
    totalSeconds += (Date.now() - loginTime) / 1000
  }

  return {
    isIn,
    lastEntry: last,
    totalSecondsToday: Math.max(0, Math.floor(totalSeconds)),
    eventCount: todayEntries.length,
  }
}

function mockAddEntry(data: { date: string; time: string; type: EntryType; notes?: string }): void {
  initMockEntries()
  const timestamp = new Date(`${data.date}T${data.time}`).toISOString()
  mockEntries.push({
    id: mockNextId++,
    timestamp,
    date: data.date,
    type: data.type,
    source: "manual",
    trigger: "via manual",
    notes: data.notes || null,
    created_at: new Date().toISOString(),
    modified_at: null,
  })
}

function mockDeleteEntry(id: number): void {
  initMockEntries()
  mockEntries = mockEntries.filter((e) => e.id !== id)
}

function mockEditEntry(id: number, updates: { timestamp?: string }): void {
  initMockEntries()
  mockEntries = mockEntries.map((e) =>
    e.id === id
      ? { ...e, ...(updates.timestamp ? { timestamp: updates.timestamp } : {}), modified_at: new Date().toISOString() }
      : e
  )
}

function mockPunch(type: EntryType): void {
  initMockEntries()
  const now = new Date()
  mockEntries.push({
    id: mockNextId++,
    timestamp: now.toISOString(),
    date: getLocalDate(),
    type,
    source: "manual",
    trigger: "via manual",
    notes: null,
    created_at: now.toISOString(),
    modified_at: null,
  })
}

// ── Hook ──

export function usePunchData(date?: string) {
  const targetDate = date || getLocalDate()
  const isToday = targetDate === getLocalDate()

  const [status, setStatus] = useState<PunchStatus | null>(null)
  const [events, setEvents] = useState<PunchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      if (isElectron) {
        const [newStatus, newEvents] = await Promise.all([
          window.electronAPI.getStatus(targetDate),
          window.electronAPI.getEvents(targetDate),
        ])
        setStatus(newStatus)
        setEvents(newEvents)
      } else {
        setStatus(getMockStatus())
        setEvents(getMockEntriesByDate(targetDate))
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch punch data:", err)
    } finally {
      setLoading(false)
    }
  }, [targetDate])

  // Re-fetch when date changes
  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  // Listen for IPC updates from main process
  useEffect(() => {
    if (!isElectron) return
    const unsubscribe = window.electronAPI.onEventUpdate(() => {
      refresh()
    })
    return unsubscribe
  }, [refresh])

  // Live timer: only tick when viewing today and punched in
  useEffect(() => {
    if (!isToday || !status?.isIn) return
    timerRef.current = setInterval(() => {
      setStatus((prev) => {
        if (!prev || !prev.isIn) return prev
        return { ...prev, totalSecondsToday: prev.totalSecondsToday + 1 }
      })
    }, 1000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isToday, status?.isIn])

  const punchIn = useCallback(async () => {
    if (isElectron) {
      await window.electronAPI.punchIn()
    } else {
      mockPunch("LOGIN")
    }
    await refresh()
  }, [refresh])

  const punchOut = useCallback(async () => {
    if (isElectron) {
      await window.electronAPI.punchOut()
    } else {
      mockPunch("LOGOUT")
    }
    await refresh()
  }, [refresh])

  const addEntry = useCallback(
    async (data: {
      date: string
      time: string
      type: "LOGIN" | "LOGOUT"
      notes?: string
    }) => {
      if (isElectron) {
        await window.electronAPI.addEntry(data)
      } else {
        mockAddEntry(data)
      }
      await refresh()
    },
    [refresh]
  )

  const editEntry = useCallback(
    async (id: number, updates: { timestamp?: string; notes?: string }) => {
      if (isElectron) {
        await window.electronAPI.editEntry(id, updates)
      } else {
        mockEditEntry(id, updates)
      }
      await refresh()
    },
    [refresh]
  )

  const deleteEntry = useCallback(
    async (id: number) => {
      if (isElectron) {
        await window.electronAPI.deleteEntry(id)
      } else {
        mockDeleteEntry(id)
      }
      await refresh()
    },
    [refresh]
  )

  return {
    status,
    events,
    loading,
    lastUpdated,
    isToday,
    punchIn,
    punchOut,
    addEntry,
    editEntry,
    deleteEntry,
    refresh,
  }
}
