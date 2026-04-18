import { useState, useEffect, useCallback } from "react"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

export interface GeneralSettings {
  autoStart: boolean
}

const DEFAULTS: GeneralSettings = {
  autoStart: true,
}

export function useGeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (isElectron) {
        const raw = await window.electronAPI.getSettings()
        setSettings({ autoStart: raw.autoStart ?? DEFAULTS.autoStart })
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = useCallback(async (updated: GeneralSettings) => {
    setSettings(updated)
    if (isElectron) {
      await window.electronAPI.updateSettings({
        autoStart: updated.autoStart,
      } as Parameters<typeof window.electronAPI.updateSettings>[0])
    }
  }, [])

  return { settings, save, loading }
}
