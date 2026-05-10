import { powerMonitor } from "electron"
import { insertEntry, getLastEntry } from "./database"
import { writeHeartbeat } from "./heartbeat"

type EventCallback = () => void

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let debounceSeconds = 15
let pendingLogout: { timestamp: string; trigger: string } | null = null
let onChangeCallback: EventCallback | null = null

// Lock state machine
let isLocked = false
let pendingUnlockTimer: ReturnType<typeof setTimeout> | null = null
let resumeFallbackTimer: ReturnType<typeof setTimeout> | null = null

const UNLOCK_CONFIRM_MS = 3000  // cancel LOGIN if lock-screen re-fires within 3s (wrong password)
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
      // lock-screen fired within 3s of unlock-screen → wrong password, stay locked
      clearTimeout(pendingUnlockTimer)
      pendingUnlockTimer = null
      return
    }
    isLocked = true
    // Debounce LOGOUT in case user unlocks quickly
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
    if (!isLocked) return  // spurious unlock when already unlocked
    // Cancel pending LOGOUT (debounce)
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; pendingLogout = null }
    // Cancel resume fallback — unlock-screen covers this
    if (resumeFallbackTimer) { clearTimeout(resumeFallbackTimer); resumeFallbackTimer = null }
    // Wait 3s to confirm this is a real unlock, not a wrong-password bounce
    pendingUnlockTimer = setTimeout(() => {
      pendingUnlockTimer = null
      isLocked = false
      logEvent("LOGIN", "via unlock")
    }, UNLOCK_CONFIRM_MS)
  })

  powerMonitor.on("suspend", () => {
    clearAllTimers()
    // Use DB as source of truth — isLocked=true does NOT guarantee a LOGOUT was
    // recorded (debounce may have been cancelled by a quick lock→unlock sequence)
    const last = getLastEntry()
    if (!last || last.type === "LOGIN") {
      isLocked = true
      logEvent("LOGOUT", "via sleep")
    }
  })

  powerMonitor.on("resume", () => {
    if (isLocked) {
      // Woke at lock screen — wait for unlock-screen before logging LOGIN
      resumeFallbackTimer = setTimeout(() => {
        resumeFallbackTimer = null
        // No unlock-screen fired → system has no lock screen configured
        isLocked = false
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
      isLocked = true
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
