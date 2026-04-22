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

export interface WorkWindow {
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

export interface PunchStatus {
  isIn: boolean
  lastEntry: PunchEntry | null
  totalSecondsToday: number
  workingSecondsToday: number
  eventCount: number
  workWindow: WorkWindow | null
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
  hotkeyCombo: string
  hotkeyMode: "press" | "push"
  hotkeyEnabled: boolean
  // Notifications
  notifyTargetEnabled: boolean
  notifyTargetMessage: string
  notifyTargetSource: "local" | "portal"
  notifyEodEnabled: boolean
  notifyEodMinutes: number
  notifyEodMessage: string
  notifyEodSource: "local" | "portal"
  // Work boundary
  workBoundaryStart: string // "HH:MM" or ""
  workBoundaryEnd: string   // "HH:MM" or ""
  // Night shift
  nightShiftEnabled: boolean
  nightShiftStart: string // "HH:MM"
  nightShiftEnd: string   // "HH:MM"
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

// ── Leave types ──

export interface LeaveApplication {
  app_id: number
  user_id: number
  leave_type_id: number
  leave_name: string
  start_date: string        // YYYY-MM-DD
  start_type: number        // 1=Full Day, 2=First Half, 3=Second Half
  end_date: string          // YYYY-MM-DD
  end_type: number          // 1=Full Day, 2=First Half
  total_days: number
  comment: string | null
  status: number
  is_approved_by_pm: boolean
  available_days: number | null
  created_at: string
  modified_at: string | null
  synced_at?: string
}

export interface LeaveSyncResult {
  success: boolean
  synced: number
  total: number
  daysMarked: number
  message?: string
}

// ── Work window types ──

export type WorkWindowSource = "default" | "nightshift" | "manual"

export interface DayWorkWindow {
  date: string
  start_time: string
  end_time: string
  source: WorkWindowSource
}

export interface NightShiftConfig {
  enabled: boolean
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

// ── Portal cache types ──

export interface PortalCacheStatus {
  cached: boolean
  permanent: boolean
  cachedAt: string | null
}

export interface PortalDayResult {
  data: PortalData | null
  fromCache: boolean
  permanent: boolean
  error?: string
}

export interface PortalRangeResult extends PortalDayResult {
  date: string
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

  // Work windows
  getWorkWindow: (date: string) => Promise<DayWorkWindow | null>
  setWorkWindow: (
    date: string,
    startTime: string,
    endTime: string,
    source: WorkWindowSource
  ) => Promise<void>
  deleteWorkWindow: (date: string) => Promise<void>
  getAllWorkWindows: () => Promise<DayWorkWindow[]>

  // HRMS portal status
  hrmsLogin: (
    email: string,
    password: string,
    baseUrl?: string
  ) => Promise<{ success: boolean; message?: string; userName?: string; userId?: number }>
  hrmsLogout: () => Promise<void>
  hrmsGetHours: (date?: string) => Promise<PortalData>
  hrmsGetStatus: () => Promise<HrmsConnectionStatus>

  // Portal cache
  portalGetDay: (date: string, force?: boolean) => Promise<PortalDayResult>
  portalGetRange: (dates: string[], force?: boolean) => Promise<PortalRangeResult[]>
  portalCacheStatus: (date: string) => Promise<PortalCacheStatus>
  portalInvalidate: (dates: string[]) => Promise<void>
  portalInvalidateAll: () => Promise<void>
  portalPopulate: (dates: string[]) => Promise<{ date: string; success: boolean }[]>
  portalSyncNonPermanent: () => Promise<{
    results: { date: string; success: boolean; promoted: boolean; error?: string }[]
    synced: number
    promoted: number
    failed: number
  }>

  // Leave data
  leaveSync: () => Promise<LeaveSyncResult>

  // Hotkey / window
  onHotkeyPushShow: (callback: (triggerKey: string) => void) => () => void
  windowHide: () => Promise<void>
  windowToggleSize: () => Promise<void>
  showNotification: (title: string, body: string) => Promise<void>
  restartApp: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
