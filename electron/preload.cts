const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  getEvents: (date: string) => ipcRenderer.invoke("get-events", date),
  getStatus: () => ipcRenderer.invoke("get-status"),
  punchIn: () => ipcRenderer.invoke("punch-in"),
  punchOut: () => ipcRenderer.invoke("punch-out"),
  addEntry: (entry: {
    date: string
    time: string
    type: "LOGIN" | "LOGOUT"
    notes?: string
  }) => ipcRenderer.invoke("add-entry", entry),
  editEntry: (
    id: number,
    updates: { timestamp?: string; type?: string; notes?: string }
  ) => ipcRenderer.invoke("edit-entry", id, updates),
  deleteEntry: (id: number) => ipcRenderer.invoke("delete-entry", id),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("update-settings", settings),
  onEventUpdate: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on("event-update", listener)
    return () => {
      ipcRenderer.removeListener("event-update", listener)
    }
  },

  // HRMS portal
  hrmsLogin: (email: string, password: string, baseUrl?: string) =>
    ipcRenderer.invoke("hrms-login", email, password, baseUrl),
  hrmsLogout: () => ipcRenderer.invoke("hrms-logout"),
  hrmsGetHours: (date?: string) => ipcRenderer.invoke("hrms-get-hours", date),
  hrmsGetStatus: () => ipcRenderer.invoke("hrms-get-status"),
})
