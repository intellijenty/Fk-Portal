import { app, BrowserWindow, Menu } from "electron"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Core modules
import {
  initDatabase,
  insertEntry,
  getLastEntry,
  closeDatabase,
  calculateTotalSecondsForDate,
  getAllSettings,
} from "./database"

import {
  readHeartbeat,
  startHeartbeat,
  stopHeartbeat,
  clearHeartbeat,
} from "./heartbeat"
import { startMonitoring, flushPendingLogout } from "./monitor"
import { createTray, updateTrayStatus, destroyTray } from "./tray"
import { registerIpcHandlers } from "./ipc"
import { registerHotkey, unregisterHotkey } from "./hotkey"
import { scheduleDailySync } from "./daily-sync"
import { initAutoUpdater, checkForUpdates } from "./updater"

let mainWindow: BrowserWindow | null = null
let isQuitting = false

// Environment & Configuration
const isDev = !app.isPackaged
const APP_NAME = app.getName()

// Separate userData folder in development (keeps DB and settings independent)
if (isDev) {
  const devUserData = path.join(app.getPath("appData"), `${APP_NAME}-Dev`)
  app.setPath("userData", devUserData)
  console.log(`Development mode: Using separate userData - ${devUserData}`)
}

// ─────────────────────────────────────────────────────────────
// Single Instance Lock (only for packaged/production builds)
// Allows Dev + Installed to run side-by-side
// ─────────────────────────────────────────────────────────────
const gotTheLock = isDev ? true : app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log("Another instance is already running. Quitting...")
  app.quit()
  process.exit(0)
}

// Handle second instance attempts (only relevant for packaged app)
if (!isDev) {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────
function syncLoginItem(enabled: boolean): void {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: enabled })
  }
}

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
    icon: path.join(__dirname, "../desktopIcon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load either dev server or built index
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-react/index.html"))
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // F12 DevTools shortcut
  mainWindow.webContents.on("before-input-event", (_, input) => {
    if (input.key === "F12" && input.type === "keyDown") {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.on("ready-to-show", () => {
    const openedAtLogin = app.isPackaged
      ? app.getLoginItemSettings().wasOpenedAtLogin
      : false

    if (!openedAtLogin) {
      mainWindow?.show()
    }
  })
}

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null) // Remove default menu bar

  // Core initialization
  initDatabase()
  handleStartupRecovery()

  // Auto-start (login item) setting
  const startupSettings = getAllSettings()
  syncLoginItem(startupSettings.autoStart !== "false")

  // Boot login entry
  insertEntry("LOGIN", "auto", "via boot")

  // Start services
  startHeartbeat(60)
  startMonitoring(notifyRenderer, 15)

  // Register IPC handlers
  registerIpcHandlers(notifyRenderer, () => mainWindow)

  // Create main window
  createWindow()

  // Register global hotkey from settings
  const settings = getAllSettings()
  registerHotkey(
    () => mainWindow,
    settings.hotkeyCombo || "Alt+Space",
    (settings.hotkeyMode || "press") as "press" | "push",
    settings.hotkeyEnabled !== "false"
  )

  // Tray
  createTray(mainWindow, handlePunchIn, handlePunchOut, handleQuit)
  refreshTray()

  // Daily background sync
  scheduleDailySync(notifyRenderer)

  // Auto-updater (only in packaged builds)
  if (app.isPackaged) {
    initAutoUpdater(() => mainWindow)
    setTimeout(() => checkForUpdates(), 5000)
  }
})

app.on("window-all-closed", () => {
  // App stays alive in tray — do not quit
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
