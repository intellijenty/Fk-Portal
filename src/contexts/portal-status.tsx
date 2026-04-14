import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

const isElectron = typeof window !== "undefined" && !!window.electronAPI

interface PortalStatusContextType {
  portalConnected: boolean
  setPortalConnected: (v: boolean) => void
}

const PortalStatusContext = createContext<PortalStatusContextType>({
  portalConnected: false,
  setPortalConnected: () => {},
})

export function PortalStatusProvider({ children }: { children: ReactNode }) {
  const [portalConnected, setPortalConnected] = useState(false)

  // Check initial status on mount
  useEffect(() => {
    async function init() {
      if (isElectron) {
        const s = await window.electronAPI.hrmsGetStatus()
        setPortalConnected(s.connected || s.hasCredentials)
      } else {
        setPortalConnected(true) // dev mock always connected
      }
    }
    init()
  }, [])

  return (
    <PortalStatusContext.Provider value={{ portalConnected, setPortalConnected }}>
      {children}
    </PortalStatusContext.Provider>
  )
}

export function usePortalStatusContext() {
  return useContext(PortalStatusContext)
}
