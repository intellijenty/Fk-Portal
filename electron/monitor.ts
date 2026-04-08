import { powerMonitor } from "electron"
import { insertEntry, getLastEntry } from "./database"
import { writeHeartbeat } from "./heartbeat"

type EventCallback = () => void

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let debounceSeconds = 15
let pendingLogout: { timestamp: string; trigger: string } | null = null
let onChangeCallback: EventCallback | null = null

function isDuplicateLogout(trigger: string): boolean {
  const last = getLastEntry()
  if (!last || last.type !== "LOGOUT") return false

  const lastTime = new Date(last.timestamp).getTime()
  const now = Date.now()
  // Suppress duplicate LOGOUT within 5 seconds (sleep + lock race)
  return now - lastTime < 5000
}

function logEvent(
  type: "LOGIN" | "LOGOUT",
  trigger: string,
  timestamp?: string
): void {
  if (type === "LOGOUT" && isDuplicateLogout(trigger)) {
    return
  }

  insertEntry(type, "auto", trigger, timestamp)
  writeHeartbeat()
  onChangeCallback?.()
}

function handleLogin(trigger: string): void {
  // If there's a pending logout from debounce, cancel it (rapid lock/unlock)
  if (pendingLogout && debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    pendingLogout = null
    return
  }

  logEvent("LOGIN", trigger)
}

function handleLogout(trigger: string): void {
  const timestamp = new Date().toISOString()

  // Use debounce: delay the logout in case an unlock follows quickly
  pendingLogout = { timestamp, trigger }

  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    if (pendingLogout) {
      logEvent("LOGOUT", pendingLogout.trigger, pendingLogout.timestamp)
      pendingLogout = null
    }
    debounceTimer = null
  }, debounceSeconds * 1000)
}

export function startMonitoring(
  onChange: EventCallback,
  debounce: number = 15
): void {
  onChangeCallback = onChange
  debounceSeconds = debounce

  powerMonitor.on("lock-screen", () => {
    handleLogout("via lock")
  })

  powerMonitor.on("unlock-screen", () => {
    handleLogin("via unlock")
  })

  powerMonitor.on("suspend", () => {
    // For suspend, we want immediate logout (no debounce) because
    // the system is going to sleep
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
      pendingLogout = null
    }
    logEvent("LOGOUT", "via sleep")
  })

  powerMonitor.on("resume", () => {
    handleLogin("via resume")
  })

  powerMonitor.on("shutdown", () => {
    // Immediate logout on shutdown
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
      pendingLogout = null
    }
    logEvent("LOGOUT", "via shutdown")
  })
}

export function flushPendingLogout(): void {
  if (pendingLogout) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    logEvent("LOGOUT", pendingLogout.trigger, pendingLogout.timestamp)
    pendingLogout = null
  }
}
