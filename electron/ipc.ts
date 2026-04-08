import { ipcMain } from "electron"
import {
  getEntriesByDate,
  getLastEntry,
  insertEntry,
  updateEntry,
  deleteEntry,
  calculateTotalSecondsForDate,
  getEventCountForDate,
  getAllSettings,
  setSetting,
} from "./database"
import {
  hrmsLogin,
  hrmsGetWorkingHours,
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

  ipcMain.handle("get-status", () => {
    const today = getLocalDate()
    const lastEntry = getLastEntry()
    const isIn = lastEntry?.type === "LOGIN"
    const totalSecondsToday = calculateTotalSecondsForDate(today)
    const eventCount = getEventCountForDate(today)

    return {
      isIn,
      lastEntry: lastEntry || null,
      totalSecondsToday,
      eventCount,
    }
  })

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

  ipcMain.handle("hrms-get-status", () => {
    return getHrmsConnectionStatus()
  })
}
