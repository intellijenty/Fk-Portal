/**
 * useNotificationEngine
 *
 * Centralized notification engine. Mount once at App root (inside
 * PortalStoreProvider). Watches today's time and fires notifications when
 * conditions are met, suppressing re-firing for the rest of that calendar day.
 *
 * Settings are treated as frozen at startup — the settings dialog shows a
 * "restart required" notice so users know changes take effect after relaunch.
 * This keeps the engine simple: no reactive settings, no complex dep arrays.
 *
 * Extending:
 *   Add a new condition block in the "Evaluate conditions" section.
 *   The registry in notifications.ts handles labels and message defaults.
 */

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { usePunchData } from "@/hooks/use-punch-data"
import { resolveSeconds, type TimeSource } from "@/lib/time-source"
import type { NotificationId } from "@/lib/notifications"

// ── Public settings shape (passed in from App) ───────────────────────────────

export interface EngineSettings {
  dailyTargetSeconds: number
  /** Portal working seconds for today — refreshes as portal cache updates */
  portalSecondsToday: number
  // Target complete
  targetEnabled: boolean
  targetSource: TimeSource
  targetMessage: string
  // EOD reminder
  eodEnabled: boolean
  eodSource: TimeSource
  eodMinutes: number
  eodMessage: string
}

// ── Delivery layer ────────────────────────────────────────────────────────────

const isElectron = typeof window !== "undefined" && !!window.electronAPI

function sendSystem(title: string, body: string) {
  if (isElectron) {
    // Route through main process — reliable on all platforms without
    // requiring Web Notification API permission grants from the renderer.
    window.electronAPI.showNotification(title, body)
  } else {
    // Dev / browser fallback
    toast(title, { description: body })
  }
}

// Channel router — extend when "in-app" or "both" channels are needed
function deliver(
  channel: "system" | "in-app" | "both",
  title: string,
  body: string
) {
  if (channel === "system" || channel === "both") sendSystem(title, body)
  if (channel === "in-app" || channel === "both") toast(title, { description: body })
}

// ── Engine hook ───────────────────────────────────────────────────────────────

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function useNotificationEngine(settings: EngineSettings) {
  const { status } = usePunchData() // always today — no date arg
  // Use working seconds (respects work window) — falls back to total when no window
  const localSeconds = status?.workingSecondsToday ?? 0

  // `${date}:${notificationId}` → fired this session
  const firedRef = useRef<Set<string>>(new Set())
  const lastDateRef = useRef<string>(getLocalDate())

  // Settings are frozen at startup — always-fresh ref lets the effect closure
  // read them without being in the dep array (which would cause re-evaluations
  // on every settings change, complicating the fired-once guarantee).
  const settingsRef = useRef<EngineSettings>(settings)
  useEffect(() => { settingsRef.current = settings })

  // Restore fired keys from previous session for today only
  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getSettings().then((s) => {
      const today = getLocalDate()
      for (const key of s.notificationsFiredKeys.split(",")) {
        if (key.startsWith(today + ":")) firedRef.current.add(key)
      }
    })
  }, [])

  useEffect(() => {
    const today = getLocalDate()

    // Midnight rollover — new day, clear fired set
    if (today !== lastDateRef.current) {
      firedRef.current.clear()
      lastDateRef.current = today
    }

    const s = settingsRef.current

    /**
     * Fire at most once per notification per calendar day.
     * fingerprint — embed a config value (e.g. eodMinutes) so that changing
     * the setting invalidates the cached "fired" state and allows re-firing.
     */
    function fireOnce(id: NotificationId, fn: () => void, fingerprint?: string) {
      const key = fingerprint ? `${today}:${id}:${fingerprint}` : `${today}:${id}`
      if (firedRef.current.has(key)) return
      firedRef.current.add(key)
      fn()
      if (isElectron) {
        window.electronAPI.updateSettings({
          notificationsFiredKeys: [...firedRef.current].join(","),
        } as Parameters<typeof window.electronAPI.updateSettings>[0])
      }
    }

    // ── Evaluate conditions ───────────────────────────────────────────────────

    // 1. Daily target reached
    if (s.targetEnabled) {
      const targetSeconds = resolveSeconds(s.targetSource, localSeconds, s.portalSecondsToday)
      if (targetSeconds >= s.dailyTargetSeconds) {
        fireOnce("target-complete", () =>
          deliver("system", "Traccia", s.targetMessage)
        )
      }
    }

    // 2. EOD reminder — fires once when remaining ≤ eodMinutes window,
    //    but only before the target is actually reached (avoids double-firing).
    //    Fingerprinted by eodMinutes: changing the threshold invalidates the
    //    cached fired state so the notification re-fires at the new threshold.
    if (s.eodEnabled) {
      const eodSeconds = resolveSeconds(s.eodSource, localSeconds, s.portalSecondsToday)
      const eodThresholdSeconds = s.dailyTargetSeconds - s.eodMinutes * 60
      if (
        eodThresholdSeconds > 0 &&
        eodSeconds >= eodThresholdSeconds &&
        eodSeconds < s.dailyTargetSeconds
      ) {
        fireOnce("eod-reminder", () =>
          deliver("system", "Traccia", s.eodMessage),
          String(s.eodMinutes)
        )
      }
    }

    // Add future notification conditions here ↓
    // e.g. miss-punch-warning, weekly-summary, etc.

  }, [localSeconds, settings.portalSecondsToday])
}
