const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  getEvents: (date: string) => ipcRenderer.invoke("get-events", date),
  getStatus: (date?: string) => ipcRenderer.invoke("get-status", date),
  punchIn: () => ipcRenderer.invoke("punch-in"),
  punchOut: () => ipcRenderer.invoke("punch-out"),
  addEntry: (entry: {
    date: string
    time: string
    type: "LOGIN" | "LOGOUT"
    notes?: string
  }) => ipcRenderer.invoke("add-entry", entry),
  editEntry: (
    id: number,
    updates: { timestamp?: string; type?: string; notes?: string }
  ) => ipcRenderer.invoke("edit-entry", id, updates),
  deleteEntry: (id: number) => ipcRenderer.invoke("delete-entry", id),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("update-settings", settings),
  onEventUpdate: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on("event-update", listener)
    return () => {
      ipcRenderer.removeListener("event-update", listener)
    }
  },

  // ── Day marks ──
  getDayMarks: () => ipcRenderer.invoke("get-day-marks"),
  setDayMark: (date: string, mark: string) =>
    ipcRenderer.invoke("set-day-mark", date, mark),
  deleteDayMark: (date: string) => ipcRenderer.invoke("delete-day-mark", date),

  // ── HRMS portal ──
  hrmsLogin: (email: string, password: string, baseUrl?: string) =>
    ipcRenderer.invoke("hrms-login", email, password, baseUrl),
  hrmsLogout: () => ipcRenderer.invoke("hrms-logout"),
  hrmsGetHours: (date?: string) => ipcRenderer.invoke("hrms-get-hours", date),
  hrmsGetStatus: () => ipcRenderer.invoke("hrms-get-status"),

  // ── Portal cache ──
  portalGetDay: (date: string, force?: boolean) =>
    ipcRenderer.invoke("portal-get-day", date, force),
  portalGetRange: (dates: string[], force?: boolean) =>
    ipcRenderer.invoke("portal-get-range", dates, force),
  portalCacheStatus: (date: string) =>
    ipcRenderer.invoke("portal-cache-status", date),
  portalInvalidate: (dates: string[]) =>
    ipcRenderer.invoke("portal-cache-invalidate", dates),
  portalInvalidateAll: () => ipcRenderer.invoke("portal-cache-invalidate-all"),
  portalPopulate: (dates: string[]) =>
    ipcRenderer.invoke("portal-cache-populate", dates),
  portalSyncNonPermanent: () =>
    ipcRenderer.invoke("portal-sync-non-permanent"),
  dailySyncRun: (force?: boolean) =>
    ipcRenderer.invoke("daily-sync-run", force),

  // ── Work windows ──
  getWorkWindow: (date: string) =>
    ipcRenderer.invoke("get-work-window", date),
  setWorkWindow: (
    date: string,
    startTime: string,
    endTime: string,
    source: "default" | "nightshift" | "manual" | "disabled"
  ) => ipcRenderer.invoke("set-work-window", date, startTime, endTime, source),
  deleteWorkWindow: (date: string) =>
    ipcRenderer.invoke("delete-work-window", date),
  getAllWorkWindows: () => ipcRenderer.invoke("get-all-work-windows"),

  // ── Leave data ──
  leaveSync: () => ipcRenderer.invoke("leave-sync"),

  // ── Hotkey / window ──
  onHotkeyPushShow: (callback: (triggerKey: string) => void) => {
    const listener = (_: unknown, triggerKey: string) => callback(triggerKey)
    ipcRenderer.on("hotkey:push-show", listener)
    return () => ipcRenderer.removeListener("hotkey:push-show", listener)
  },
  windowHide: () => ipcRenderer.invoke("window-hide"),
  windowToggleSize: () => ipcRenderer.invoke("window-toggle-size"),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke("show-notification", title, body),
  restartApp: () => ipcRenderer.invoke("restart-app"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),

  // ── Auto-update ──
  getAppVersion: () => ipcRenderer.invoke("app:version"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),

  onUpdateChecking: (cb: () => void) => {
    const fn = () => cb()
    ipcRenderer.on("update:checking", fn)
    return () => ipcRenderer.removeListener("update:checking", fn)
  },
  onUpdateAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) => {
    const fn = (_: unknown, info: { version: string; releaseNotes?: string }) => cb(info)
    ipcRenderer.on("update:available", fn)
    return () => ipcRenderer.removeListener("update:available", fn)
  },
  onUpdateNotAvailable: (cb: () => void) => {
    const fn = () => cb()
    ipcRenderer.on("update:not-available", fn)
    return () => ipcRenderer.removeListener("update:not-available", fn)
  },
  onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number }) => void) => {
    const fn = (_: unknown, p: { percent: number; transferred: number; total: number }) => cb(p)
    ipcRenderer.on("update:progress", fn)
    return () => ipcRenderer.removeListener("update:progress", fn)
  },
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    const fn = (_: unknown, info: { version: string }) => cb(info)
    ipcRenderer.on("update:downloaded", fn)
    return () => ipcRenderer.removeListener("update:downloaded", fn)
  },
  onUpdateError: (cb: (msg: string) => void) => {
    const fn = (_: unknown, msg: string) => cb(msg)
    ipcRenderer.on("update:error", fn)
    return () => ipcRenderer.removeListener("update:error", fn)
  },
})

contextBridge.exposeInMainWorld('licenseAPI', {
  getHwid: () => ipcRenderer.invoke('license:get-hwid'),
  submitLicense: (key: string) => ipcRenderer.invoke('license:submit', key),
  checkStatus: () => ipcRenderer.invoke('license:check-status'),
});