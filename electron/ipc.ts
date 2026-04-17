import { ipcMain, BrowserWindow } from "electron"
import { registerHotkey } from "./hotkey"
import {
  getEntriesByDate,
  getLastEntry,
  getLastEntryByDate,
  insertEntry,
  updateEntry,
  deleteEntry,
  calculateTotalSecondsForDate,
  getEventCountForDate,
  getWeekSummaries,
  getAllDayMarks,
  setDayMark,
  deleteDayMark,
  getAllSettings,
  setSetting,
} from "./database"
import {
  hrmsLogin,
  hrmsGetWorkingHours,
  getHrmsConnectionStatus,
  clearCredentials,
} from "./hrms"
import {
  getFromCache,
  setToCache,
  isDatePermanent,
  getCacheStatus,
  invalidateDates,
  invalidateAll,
} from "./portal-cache"

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA") // YYYY-MM-DD
}

function buildSettingsResponse(raw: Record<string, string>) {
  return {
    dailyTargetMinutes: parseInt(raw.dailyTargetMinutes || "480", 10),
    autoStart: raw.autoStart === "true",
    startMinimized: raw.startMinimized === "true",
    debounceSeconds: parseInt(raw.debounceSeconds || "15", 10),
    heartbeatSeconds: parseInt(raw.heartbeatSeconds || "60", 10),
    closeToTray: raw.closeToTray === "true",
    hotkeyCombo: raw.hotkeyCombo || "Alt+Space",
    hotkeyMode: (raw.hotkeyMode || "press") as "press" | "push",
    hotkeyEnabled: raw.hotkeyEnabled !== "false",
  }
}

export function registerIpcHandlers(
  onDataChange: () => void,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle("get-events", (_event, date: string) => {
    return getEntriesByDate(date)
  })

  ipcMain.handle("get-status", (_event, date?: string) => {
    const targetDate = date || getLocalDate()
    const isToday = targetDate === getLocalDate()
    const lastEntry = isToday ? getLastEntry() : getLastEntryByDate(targetDate)
    const isIn = isToday ? lastEntry?.type === "LOGIN" : false
    const totalSecondsToday = calculateTotalSecondsForDate(targetDate)
    const eventCount = getEventCountForDate(targetDate)

    return {
      isIn,
      lastEntry: lastEntry || null,
      totalSecondsToday,
      eventCount,
    }
  })

  ipcMain.handle(
    "get-week-summaries",
    (_event, startDate: string, endDate: string) => {
      return getWeekSummaries(startDate, endDate)
    }
  )

  ipcMain.handle("punch-in", () => {
    const entry = insertEntry("LOGIN", "manual", "via manual")
    onDataChange()
    return entry
  })

  ipcMain.handle("punch-out", () => {
    const entry = insertEntry("LOGOUT", "manual", "via manual")
    onDataChange()
    return entry
  })

  ipcMain.handle(
    "add-entry",
    (
      _event,
      data: { date: string; time: string; type: "LOGIN" | "LOGOUT"; notes?: string }
    ) => {
      // Combine date and time into ISO timestamp
      const timestamp = new Date(`${data.date}T${data.time}`).toISOString()
      const entry = insertEntry(data.type, "manual", "via manual", timestamp, data.notes)
      onDataChange()
      return entry
    }
  )

  ipcMain.handle(
    "edit-entry",
    (
      _event,
      id: number,
      updates: { timestamp?: string; type?: string; notes?: string }
    ) => {
      const entry = updateEntry(id, updates)
      onDataChange()
      return entry
    }
  )

  ipcMain.handle("delete-entry", (_event, id: number) => {
    deleteEntry(id)
    onDataChange()
  })

  ipcMain.handle("get-settings", () => {
    return buildSettingsResponse(getAllSettings())
  })

  ipcMain.handle(
    "update-settings",
    (_event, settings: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(settings)) {
        setSetting(key, String(value))
      }
      // Re-register hotkey whenever hotkey settings change
      const HOTKEY_KEYS = ["hotkeyCombo", "hotkeyMode", "hotkeyEnabled"]
      if (HOTKEY_KEYS.some((k) => k in settings)) {
        const raw = getAllSettings()
        const win = getWindow()
        if (win) {
          registerHotkey(
            () => win,
            raw.hotkeyCombo || "Alt+Space",
            (raw.hotkeyMode || "press") as "press" | "push",
            raw.hotkeyEnabled !== "false"
          )
        }
      }
      return buildSettingsResponse(getAllSettings())
    }
  )

  // Hide window — used by push-to-display mode when trigger key is released
  ipcMain.handle("window-hide", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.hide()
  })

  // ── HRMS portal handlers ──

  ipcMain.handle(
    "hrms-login",
    async (
      _event,
      email: string,
      password: string,
      baseUrl?: string
    ) => {
      if (baseUrl) setSetting("hrmsBaseUrl", baseUrl)
      return hrmsLogin(email, password)
    }
  )

  ipcMain.handle("hrms-logout", () => {
    clearCredentials()
  })

  ipcMain.handle("hrms-get-hours", async (_event, date?: string) => {
    return hrmsGetWorkingHours(date)
  })

  ipcMain.handle("get-day-marks", () => {
    return getAllDayMarks()
  })

  ipcMain.handle("set-day-mark", (_event, date: string, mark: string) => {
    setDayMark(date, mark)
  })

  ipcMain.handle("delete-day-mark", (_event, date: string) => {
    deleteDayMark(date)
  })

  ipcMain.handle("hrms-get-status", () => {
    return getHrmsConnectionStatus()
  })

  // ── Portal cache handlers ──

  async function fetchAndCacheDay(
    date: string,
    force: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ data: any | null; fromCache: boolean; permanent: boolean; error?: string }> {
    const permanent = isDatePermanent(date)

    // Permanent dates: always serve from cache (immutable biometric data)
    if (permanent) {
      const cached = getFromCache(date)
      if (cached) return { data: cached.data, fromCache: true, permanent: true }
      // Not cached yet — fall through to fetch
    }

    // Non-permanent: serve from cache unless forced
    if (!force) {
      const cached = getFromCache(date)
      if (cached) return { data: cached.data, fromCache: true, permanent: false }
    }

    // Fetch from HRMS API
    const apiDate = `${date}T00:00:00.000Z`
    const result = await hrmsGetWorkingHours(apiDate)
    if (result.success) {
      setToCache(date, result)
    }
    return {
      data: result,
      fromCache: false,
      permanent: false,
      error: result.success ? undefined : result.message,
    }
  }

  ipcMain.handle(
    "portal-get-day",
    async (_event, date: string, force?: boolean) => {
      return fetchAndCacheDay(date, force ?? false)
    }
  )

  ipcMain.handle(
    "portal-get-range",
    async (_event, dates: string[], force?: boolean) => {
      const results = await Promise.all(
        dates.map(async (date) => {
          const result = await fetchAndCacheDay(date, force ?? false)
          return { date, ...result }
        })
      )
      return results
    }
  )

  ipcMain.handle("portal-cache-status", (_event, date: string) => {
    return getCacheStatus(date)
  })

  ipcMain.handle("portal-cache-invalidate", (_event, dates: string[]) => {
    invalidateDates(dates)
  })

  ipcMain.handle("portal-cache-invalidate-all", () => {
    invalidateAll()
  })

  ipcMain.handle("portal-cache-populate", async (_event, dates: string[]) => {
    // Fetch and cache all given dates (force-refresh regardless of cache state)
    const results = await Promise.all(
      dates.map(async (date) => {
        const result = await fetchAndCacheDay(date, true)
        return { date, success: result.data?.success ?? false }
      })
    )
    return results
  })
}
