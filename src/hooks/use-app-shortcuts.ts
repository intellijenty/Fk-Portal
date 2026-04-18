/**
 * useAppShortcuts — centralized in-app keyboard shortcut engine.
 *
 * Call once at the app root. Pass a stable ShortcutHandlers map.
 * Internally uses a ref so handlers are always current without re-subscribing.
 *
 * Guarantees:
 *  - Only fires when the app window is focused (keyboard events only reach a
 *    focused window in Electron, so this is automatic).
 *  - Never fires when focus is inside an input, textarea, select, or
 *    contenteditable element.
 *  - Checks modifiers exactly — a shortcut defined with no modifiers will NOT
 *    fire when Ctrl/Alt/Shift/Meta is held.
 *  - Calls e.preventDefault() before dispatching so the browser doesn't also
 *    handle the key (e.g. "f" opening find-in-page).
 */

import { useEffect, useRef } from "react"
import { SHORTCUTS, type ShortcutHandlers } from "@/lib/shortcuts"

const BLOCKED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

export function useAppShortcuts(handlers: ShortcutHandlers): void {
  // Keep a ref so the keydown listener never goes stale without re-attaching.
  const handlersRef = useRef<ShortcutHandlers>(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // Do not intercept keystrokes when the user is typing.
      const target = e.target as HTMLElement
      if (BLOCKED_TAGS.has(target.tagName) || target.isContentEditable) return

      for (const shortcut of SHORTCUTS) {
        const handler = handlersRef.current[shortcut.id]
        if (!handler) continue

        // Key match (case-insensitive for single printable chars).
        if (e.key.toLowerCase() !== shortcut.defaultKey.toLowerCase()) continue

        // Modifier match — every declared modifier must match exactly.
        const m = shortcut.modifiers ?? {}
        if ((m.ctrl ?? false) !== e.ctrlKey) continue
        if ((m.alt ?? false) !== e.altKey) continue
        if ((m.shift ?? false) !== e.shiftKey) continue
        if ((m.meta ?? false) !== e.metaKey) continue

        e.preventDefault()
        handler()
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, []) // intentionally empty — handlers are always fresh via ref
}
