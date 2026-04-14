import { app, BrowserWindow, Menu } from "electron"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { initDatabase, insertEntry, getLastEntry, closeDatabase, calculateTotalSecondsForDate, getAllSettings } from "./database"
import { readHeartbeat, startHeartbeat, stopHeartbeat, clearHeartbeat } from "./heartbeat"
import { startMonitoring, flushPendingLogout } from "./monitor"
import { createTray, updateTrayStatus, destroyTray } from "./tray"
import { registerIpcHandlers } from "./ipc"
import { registerHotkey, unregisterHotkey } from "./hotkey"

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA")
}

function notifyRenderer(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("event-update")
  }
  refreshTray()
}

function refreshTray(): void {
  const lastEntry = getLastEntry()
  const status = lastEntry?.type === "LOGIN" ? "in" : "out"
  const totalSeconds = calculateTotalSecondsForDate(getLocalDate())
  const timeStr = formatTime(totalSeconds)

  updateTrayStatus(
    status,
    timeStr,
    mainWindow,
    handlePunchIn,
    handlePunchOut,
    handleQuit
  )
}

function handlePunchIn(): void {
  insertEntry("LOGIN", "manual", "via manual")
  notifyRenderer()
}

function handlePunchOut(): void {
  insertEntry("LOGOUT", "manual", "via manual")
  notifyRenderer()
}

function handleQuit(): void {
  isQuitting = true

  // If currently IN, log a LOGOUT
  const lastEntry = getLastEntry()
  if (lastEntry?.type === "LOGIN") {
    insertEntry("LOGOUT", "auto", "via quit")
  }

  flushPendingLogout()
  stopHeartbeat()
  clearHeartbeat()
  closeDatabase()
  destroyTray()
  app.quit()
}

function handleStartupRecovery(): void {
  const lastEntry = getLastEntry()

  // If last entry is a LOGIN with no matching LOGOUT, session was orphaned
  if (lastEntry && lastEntry.type === "LOGIN") {
    const heartbeat = readHeartbeat()
    const estimatedTime = heartbeat?.timestamp || lastEntry.timestamp

    insertEntry(
      "LOGOUT",
      "estimated",
      "via estimated",
      estimatedTime,
      "Session ended unexpectedly. Logout time estimated from last heartbeat."
    )
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 780,
    minWidth: 400,
    minHeight: 600,
    resizable: true,
    frame: true,
    show: false,
    backgroundColor: "#0a0a0a",
    icon: path.join(__dirname, "../resources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Remove default menu bar
    Menu.setApplicationMenu(null)

    // Initialize
    initDatabase()
    handleStartupRecovery()

    // Log boot LOGIN
    insertEntry("LOGIN", "auto", "via boot")

    // Start heartbeat
    startHeartbeat(60)

    // Register IPC — pass notifyRenderer + window getter
    registerIpcHandlers(notifyRenderer, () => mainWindow)

    // Create window
    createWindow()

    // Register global hotkey from stored settings
    const raw = getAllSettings()
    registerHotkey(
      () => mainWindow,
      raw.hotkeyCombo || "Alt+Space",
      (raw.hotkeyMode || "press") as "press" | "push",
      raw.hotkeyEnabled !== "false"
    )

    // Create tray
    createTray(mainWindow, handlePunchIn, handlePunchOut, handleQuit)
    refreshTray()

    // Start monitoring power events
    startMonitoring(notifyRenderer, 15)
  })

  app.on("window-all-closed", () => {
    // Don't quit on window close — we live in the tray
  })

  app.on("before-quit", () => {
    isQuitting = true
    unregisterHotkey()
  })

  app.on("activate", () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })
}
