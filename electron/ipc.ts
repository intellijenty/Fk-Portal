import { app, ipcMain, BrowserWindow, Notification } from "electron"
import { registerHotkey } from "./hotkey"
import { syncLeaves } from "./leave-sync"
import { checkForUpdates, downloadUpdate, quitAndInstall } from "./updater"
import {
  getEntriesByDate,
  getLastEntry,
  getLastEntryByDate,
  insertEntry,
  updateEntry,
  deleteEntry,
  calculateTotalSecondsForDate,
  calculateWorkingSecondsForDate,
  resolveWorkWindow,
  getEventCountForDate,
  getWeekSummaries,
  getAllDayMarks,
  setDayMark,
  deleteDayMark,
  getAllSettings,
  setSetting,
  getWorkWindow,
  setWorkWindow,
  deleteWorkWindow,
  getAllWorkWindows,
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
import { syncNonPermanentDays } from "./portal-sync"
import { runDailySync } from "./daily-sync"
import ElectronStore from 'electron-store';
import { LicenseEngine } from './license-engine';

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
    // Notifications
    notifyTargetEnabled: raw.notifyTargetEnabled === "true",
    notifyTargetMessage: raw.notifyTargetMessage || "Target completed for today",
    notifyTargetSource: (raw.notifyTargetSource || "local") as "local" | "portal",
    notifyEodEnabled: raw.notifyEodEnabled === "true",
    notifyEodMinutes: parseInt(raw.notifyEodMinutes || "5", 10),
    notifyEodMessage: raw.notifyEodMessage || "EOD Reminder! We are close to reach our target!",
    notifyEodSource: (raw.notifyEodSource || "local") as "local" | "portal",
    // Work boundary
    workBoundaryStart: raw.workBoundaryStart || "",
    workBoundaryEnd: raw.workBoundaryEnd || "",
    // Night shift
    nightShiftEnabled: raw.nightShiftEnabled === "true",
    nightShiftStart: raw.nightShiftStart || "22:00",
    nightShiftEnd: raw.nightShiftEnd || "06:00",
  }
}

// ── Window size toggle ────────────────────────────────────────────────────────
// Two fixed states: narrow (480×780) or maximized.
// No arbitrary intermediate sizes — future builds will enforce this strictly.
const NARROW_WIDTH = 480
const NARROW_HEIGHT = 780

const electronStore = new ElectronStore();
const licenseEngine = new LicenseEngine();

export function registerIpcHandlers(
  onDataChange: () => void,
  getWindow: () => BrowserWindow | null
): void {
  // License handlers
  ipcMain.handle('license:get-hwid', () => licenseEngine.getHardwareId());
  
  ipcMain.handle('license:check-status', () => licenseEngine.verify(electronStore.get('license_key') as string));
  
  ipcMain.handle('license:submit', (_event, key: string) => {
    if (licenseEngine.verify(key)) {
      electronStore.set('license_key', key);
      return { success: true };
    }
    return { success: false, message: 'Invalid License Key' };
  });
  
  ipcMain.handle("show-notification", (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  ipcMain.handle("restart-app", () => {
    app.relaunch()
    app.exit(0)
  })

  // ── Auto-update handlers ──
  ipcMain.handle("app:version", () => app.getVersion())

  ipcMain.handle("update:check", () => {
    if (app.isPackaged) checkForUpdates()
  })

  ipcMain.handle("update:download", () => {
    downloadUpdate()
  })

  ipcMain.handle("update:install", () => {
    quitAndInstall()
  })

  ipcMain.handle("get-events", (_event, date: string) => {
    return getEntriesByDate(date)
  })

  ipcMain.handle("get-status", (_event, date?: string) => {
    const targetDate = date || getLocalDate()
    const isToday = targetDate === getLocalDate()
    const lastEntry = isToday ? getLastEntry() : getLastEntryByDate(targetDate)
    const isIn = isToday ? lastEntry?.type === "LOGIN" : false
    const totalSecondsToday = calculateTotalSecondsForDate(targetDate)
    const workingSecondsToday = calculateWorkingSecondsForDate(targetDate)
    const eventCount = getEventCountForDate(targetDate)
    const workWindow = resolveWorkWindow(targetDate)

    return {
      isIn,
      lastEntry: lastEntry || null,
      totalSecondsToday,
      workingSecondsToday,
      eventCount,
      workWindow,
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
      // Sync login item when autoStart changes
      if ("autoStart" in settings && app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin: settings.autoStart === true })
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
      onDataChange()
      return buildSettingsResponse(getAllSettings())
    }
  )

  // Hide window — used by push-to-display mode when trigger key is released
  ipcMain.handle("window-hide", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.hide()
  })

  // Toggle between compact narrow view and maximized (app shortcut "F")
  ipcMain.handle("window-toggle-size", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getWindow()
    if (!win) return
    if (win.isMaximized()) {
      // Maximized → narrow fixed size
      win.unmaximize()
      win.setSize(NARROW_WIDTH, NARROW_HEIGHT, true)
      win.center()
    } else {
      // Narrow (or any non-maximized) → maximize
      win.maximize()
    }
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

  // ── Work window handlers ──

  ipcMain.handle("get-work-window", (_event, date: string) => {
    return getWorkWindow(date) || null
  })

  ipcMain.handle(
    "set-work-window",
    (
      _event,
      date: string,
      startTime: string,
      endTime: string,
      source: "default" | "nightshift" | "manual"
    ) => {
      setWorkWindow(date, startTime, endTime, source)
      onDataChange()
    }
  )

  ipcMain.handle("delete-work-window", (_event, date: string) => {
    deleteWorkWindow(date)
    onDataChange()
  })

  ipcMain.handle("get-all-work-windows", () => {
    return getAllWorkWindows()
  })

  // ── Portal cache handlers ──

  async function fetchAndCacheDay(
    date: string,
    force: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ data: any | null; fromCache: boolean; permanent: boolean; error?: string }> {

    // Today's data is NEVER stored in SQLite — always fetch fresh from the API.
    // It lives only in the renderer's in-memory React state.
    if (date === getLocalDate()) {
      const apiDate = `${date}T00:00:00.000Z`
      const result = await hrmsGetWorkingHours(apiDate)
      return {
        data: result.success ? result : null,
        fromCache: false,
        permanent: false,
        error: result.success ? undefined : result.message,
      }
    }

    const permanent = isDatePermanent(date)

    // Permanent dates: always serve from cache (immutable biometric data)
    if (permanent) {
      const cached = getFromCache(date)
      if (cached) return { data: cached.data, fromCache: true, permanent: true }
      // Not cached yet — fall through to fetch
    }

    // Non-permanent past dates: serve from cache unless forced
    if (!force) {
      const cached = getFromCache(date)
      if (cached) return { data: cached.data, fromCache: true, permanent: false }
    }

    // Fetch from HRMS API and store in SQLite
    const apiDate = `${date}T00:00:00.000Z`
    const result = await hrmsGetWorkingHours(apiDate)
    if (result.success) {
      setToCache(date, result)
    }
    return {
      data: result.success ? result : null,
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

  // ── Leave data ──

  ipcMain.handle("leave-sync", async () => {
    const result = await syncLeaves()
    if (result.success) onDataChange()
    return result
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

  // ── Non-permanent sync ──

  ipcMain.handle("portal-sync-non-permanent", async () => {
    return syncNonPermanentDays()
  })

  // ── Daily sync ──

  ipcMain.handle("daily-sync-run", async (_event, force?: boolean) => {
    const report = await runDailySync(force ?? false)
    // Notify renderer to reload day_marks — syncLeaves writes to day_marks table
    if (!report.skipped) onDataChange()
    return report
  })
}
