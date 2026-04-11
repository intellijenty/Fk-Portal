import { ipcMain } from "electron"
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
  hrmsGetWeekHours,
  getHrmsConnectionStatus,
  clearCredentials,
} from "./hrms"

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA") // YYYY-MM-DD
}

export function registerIpcHandlers(onDataChange: () => void): void {
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
    const raw = getAllSettings()
    return {
      dailyTargetMinutes: parseInt(raw.dailyTargetMinutes || "480", 10),
      autoStart: raw.autoStart === "true",
      startMinimized: raw.startMinimized === "true",
      debounceSeconds: parseInt(raw.debounceSeconds || "15", 10),
      heartbeatSeconds: parseInt(raw.heartbeatSeconds || "60", 10),
      closeToTray: raw.closeToTray === "true",
    }
  })

  ipcMain.handle(
    "update-settings",
    (_event, settings: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(settings)) {
        setSetting(key, String(value))
      }
      const raw = getAllSettings()
      return {
        dailyTargetMinutes: parseInt(raw.dailyTargetMinutes || "480", 10),
        autoStart: raw.autoStart === "true",
        startMinimized: raw.startMinimized === "true",
        debounceSeconds: parseInt(raw.debounceSeconds || "15", 10),
        heartbeatSeconds: parseInt(raw.heartbeatSeconds || "60", 10),
        closeToTray: raw.closeToTray === "true",
      }
    }
  )

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

  ipcMain.handle("hrms-get-week-hours", async (_event, dates: string[]) => {
    return hrmsGetWeekHours(dates)
  })

  ipcMain.handle("hrms-get-status", () => {
    return getHrmsConnectionStatus()
  })
}
