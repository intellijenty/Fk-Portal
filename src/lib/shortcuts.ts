/**
 * App Shortcuts Registry
 *
 * Central definition of every in-app keyboard shortcut.
 * These only fire when the app window is focused and the focused element is
 * not a text input — they never intercept keystrokes from other applications.
 *
 * Adding a shortcut:
 *   1. Extend the ShortcutId union with a new literal.
 *   2. Add an entry to SHORTCUTS.
 *   3. Register a handler in App.tsx via useAppShortcuts().
 *
 * Configurable shortcuts (configurable: true) are ones the user will be able
 * to remap from the Settings → Accessibility tab in the future. Built-in
 * shortcuts (configurable: false) are fixed and not shown in settings.
 */

export type ShortcutId =
  | "toggle-window-size"
// Add more ids here as the app grows, e.g.:
// | "punch-in"
// | "punch-out"
// | "open-settings"

export interface AppShortcut {
  id: ShortcutId
  /** The key value as returned by KeyboardEvent.key (case-insensitive for single chars). */
  defaultKey: string
  modifiers?: {
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
  }
  label: string
  description: string
  /** When true the user can remap this key from Settings. When false it is fixed. */
  configurable: boolean
}

export const SHORTCUTS: readonly AppShortcut[] = [
  {
    id: "toggle-window-size",
    defaultKey: "f",
    label: "Toggle Window Size",
    description: "Switch between compact narrow view and full window",
    configurable: false,
  },
] as const

/** Convenience map for O(1) lookup by id. */
export const SHORTCUT_MAP = new Map<ShortcutId, AppShortcut>(
  SHORTCUTS.map((s) => [s.id, s])
)

/** Handler map type — pass this into useAppShortcuts(). */
export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>
