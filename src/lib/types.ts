export type EntryType = "LOGIN" | "LOGOUT"
export type EntrySource = "auto" | "manual" | "estimated"
export type EntryTrigger =
  | "via boot"
  | "via unlock"
  | "via resume"
  | "via manual"
  | "via lock"
  | "via shutdown"
  | "via sleep"
  | "via estimated"
  | "via quit"

export interface PunchEntry {
  id: number
  timestamp: string // UTC ISO-8601
  date: string // YYYY-MM-DD local
  type: EntryType
  source: EntrySource
  trigger: EntryTrigger
  notes: string | null
  created_at: string
  modified_at: string | null
}

export interface PunchStatus {
  isIn: boolean
  lastEntry: PunchEntry | null
  totalSecondsToday: number
  eventCount: number
}

export interface DailySummary {
  date: string
  totalSeconds: number
  eventCount: number
  entries: PunchEntry[]
}

export interface AppSettings {
  dailyTargetMinutes: number
  autoStart: boolean
  startMinimized: boolean
  debounceSeconds: number
  heartbeatSeconds: number
  closeToTray: boolean
}

export interface WeekDaySummary {
  date: string
  totalSeconds: number
  eventCount: number
  missPunchCount: number
}

// ── Portal / HRMS types ──

export interface PortalEntry {
  empid: number
  logdate: string
  intime: string
  outtime: string | null
  workingmins: number | null
  ismanual: number
}

export interface PortalData {
  success: boolean
  entries: PortalEntry[]
  totalMinutes: number
  isCurrentlyIn: boolean
  lastInTime: string | null
  activeSessionMinutes: number
  message?: string
}

export interface HrmsConnectionStatus {
  connected: boolean
  userName: string | null
  userId: number | null
  hasCredentials: boolean
}

export interface ElectronAPI {
  getEvents: (date: string) => Promise<PunchEntry[]>
  getStatus: (date?: string) => Promise<PunchStatus>
  getWeekSummaries: (startDate: string, endDate: string) => Promise<WeekDaySummary[]>
  punchIn: () => Promise<PunchEntry>
  punchOut: () => Promise<PunchEntry>
  addEntry: (entry: {
    date: string
    time: string
    type: EntryType
    notes?: string
  }) => Promise<PunchEntry>
  editEntry: (
    id: number,
    updates: { timestamp?: string; type?: EntryType; notes?: string }
  ) => Promise<PunchEntry>
  deleteEntry: (id: number) => Promise<void>
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  onEventUpdate: (callback: () => void) => () => void

  // Day marks
  getDayMarks: () => Promise<{ date: string; mark: string }[]>
  setDayMark: (date: string, mark: string) => Promise<void>
  deleteDayMark: (date: string) => Promise<void>

  // HRMS portal
  hrmsLogin: (
    email: string,
    password: string,
    baseUrl?: string
  ) => Promise<{ success: boolean; message?: string; userName?: string; userId?: number }>
  hrmsLogout: () => Promise<void>
  hrmsGetHours: (date?: string) => Promise<PortalData>
  hrmsGetWeekHours: (dates: string[]) => Promise<WeekDaySummary[]>
  hrmsGetStatus: () => Promise<HrmsConnectionStatus>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
