import { powerMonitor } from "electron"
import { insertEntry, getLastEntry } from "./database"
import { writeHeartbeat } from "./heartbeat"

type EventCallback = () => void

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let debounceSeconds = 15
let pendingLogout: { timestamp: string; trigger: string } | null = null
let onChangeCallback: EventCallback | null = null

let pendingUnlockTimer: ReturnType<typeof setTimeout> | null = null
let resumeFallbackTimer: ReturnType<typeof setTimeout> | null = null

const UNLOCK_CONFIRM_MS = 3000   // cancel LOGIN if lock-screen re-fires within 3s (wrong password)
const RESUME_FALLBACK_MS = 10000 // if no unlock-screen after resume, assume no lock screen

function clearAllTimers(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; pendingLogout = null }
  if (pendingUnlockTimer) { clearTimeout(pendingUnlockTimer); pendingUnlockTimer = null }
  if (resumeFallbackTimer) { clearTimeout(resumeFallbackTimer); resumeFallbackTimer = null }
}

function logEvent(
  type: "LOGIN" | "LOGOUT",
  trigger: string,
  timestamp?: string
): void {
  // DB is source of truth — skip if already in this state (prevents ghost entries)
  const last = getLastEntry()
  if (last?.type === type) return
  insertEntry(type, "auto", trigger, timestamp)
  writeHeartbeat()
  onChangeCallback?.()
}

export function startMonitoring(
  onChange: EventCallback,
  debounce: number = 15
): void {
  onChangeCallback = onChange
  debounceSeconds = debounce

  powerMonitor.on("lock-screen", () => {
    if (pendingUnlockTimer) {
      // lock-screen within 3s of unlock-screen → wrong password, cancel the pending LOGIN
      clearTimeout(pendingUnlockTimer)
      pendingUnlockTimer = null
      return
    }
    // Debounce LOGOUT — cancelled if user unlocks quickly
    const timestamp = new Date().toISOString()
    pendingLogout = { timestamp, trigger: "via lock" }
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (pendingLogout) {
        logEvent("LOGOUT", pendingLogout.trigger, pendingLogout.timestamp)
        pendingLogout = null
      }
      debounceTimer = null
    }, debounceSeconds * 1000)
  })

  powerMonitor.on("unlock-screen", () => {
    // Cancel pending LOGOUT debounce (user unlocked quickly)
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; pendingLogout = null }
    // Cancel resume fallback — real unlock covers it
    if (resumeFallbackTimer) { clearTimeout(resumeFallbackTimer); resumeFallbackTimer = null }
    // Already waiting for unlock confirmation — don't stack timers
    if (pendingUnlockTimer) return
    // Wait 3s to confirm this is a real unlock, not a wrong-password bounce
    pendingUnlockTimer = setTimeout(() => {
      pendingUnlockTimer = null
      logEvent("LOGIN", "via unlock")
    }, UNLOCK_CONFIRM_MS)
  })

  powerMonitor.on("suspend", () => {
    clearAllTimers()
    const last = getLastEntry()
    if (!last || last.type === "LOGIN") {
      logEvent("LOGOUT", "via sleep")
    }
  })

  powerMonitor.on("resume", () => {
    const last = getLastEntry()
    if (last?.type === "LOGOUT") {
      // Properly suspended — wait for unlock-screen before logging LOGIN
      resumeFallbackTimer = setTimeout(() => {
        resumeFallbackTimer = null
        // No unlock-screen fired → no lock screen configured; log LOGIN directly
        logEvent("LOGIN", "via resume")
      }, RESUME_FALLBACK_MS)
    } else {
      logEvent("LOGIN", "via resume")
    }
  })

  powerMonitor.on("shutdown", () => {
    clearAllTimers()
    const last = getLastEntry()
    if (!last || last.type === "LOGIN") {
      logEvent("LOGOUT", "via shutdown")
    }
  })
}

export function flushPendingLogout(): void {
  if (pendingLogout) {
    clearAllTimers()
    logEvent("LOGOUT", pendingLogout.trigger, pendingLogout.timestamp)
    pendingLogout = null
  }
}
