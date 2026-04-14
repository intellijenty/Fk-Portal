import { useState, useEffect, useCallback } from "react"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

export interface HotkeySettings {
  combo: string
  mode: "press" | "push"
  enabled: boolean
}

const DEFAULTS: HotkeySettings = {
  combo: "Alt+Space",
  mode: "press",
  enabled: true,
}

export function useHotkeySettings() {
  const [settings, setSettings] = useState<HotkeySettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (isElectron) {
        const raw = await window.electronAPI.getSettings()
        setSettings({
          combo: raw.hotkeyCombo ?? DEFAULTS.combo,
          mode: raw.hotkeyMode ?? DEFAULTS.mode,
          enabled: raw.hotkeyEnabled ?? DEFAULTS.enabled,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = useCallback(async (updated: HotkeySettings) => {
    setSettings(updated)
    if (isElectron) {
      await window.electronAPI.updateSettings({
        hotkeyCombo: updated.combo,
        hotkeyMode: updated.mode,
        hotkeyEnabled: updated.enabled,
      } as Parameters<typeof window.electronAPI.updateSettings>[0])
    }
  }, [])

  return { settings, save, loading }
}
