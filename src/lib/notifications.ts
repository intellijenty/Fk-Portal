/**
 * Notification Registry
 *
 * Central definition of every notification the app can emit.
 * Adding a notification:
 *   1. Extend NotificationId union.
 *   2. Add a NotificationDef entry to NOTIFICATION_REGISTRY.
 *   3. Implement the trigger condition in use-notification-engine.ts.
 */

export type NotificationId = "target-complete" | "eod-reminder"
// Future: | "miss-punch-warning" | "weekly-summary" | ...

export interface NotificationDef {
  id: NotificationId
  /** Brief label shown in the Settings UI */
  label: string
  /** One-line description shown in the Settings UI */
  description: string
}

export const NOTIFICATION_REGISTRY: readonly NotificationDef[] = [
  {
    id: "target-complete",
    label: "Daily target reached",
    description: "Notify when you hit your daily hour target",
  },
  {
    id: "eod-reminder",
    label: "EOD reminder",
    description: "Remind you a few minutes before reaching target",
  },
] as const
