# LoginMonitor — Architecture Reference

## Overview

Electron desktop app that monitors PC login/logout events, calculates worked hours, and syncs with an HRMS portal. Built with Electron + React (Vite) + SQLite.

**Process split:**
- **Main process** — SQLite, OS event monitoring, IPC handlers, tray, hotkey
- **Renderer process** — React UI (Vite), context + hooks for state, shadcn/ui components

---

## Directory Structure

```
electron/           Main process code
  main.ts           Entry point, window creation, startup sequence
  preload.cts       Context bridge — exposes window.electronAPI to renderer
  ipc.ts            All ipcMain.handle() registrations
  database.ts       SQLite layer (better-sqlite3) — all DB operations
  monitor.ts        Power event listener (lock/unlock/suspend/shutdown)
  heartbeat.ts      Writes heartbeat.json for crash recovery
  hotkey.ts         Global shortcut registration, press/push modes
  tray.ts           System tray icon, context menu, status display
  hrms.ts           HRMS portal API client (net.fetch), credential storage
  portal-cache.ts   SQLite-backed portal data cache, permanence logic

src/
  App.tsx                     Root — layout routing, shared state
  contexts/
    portal-store.tsx          Central portal data store (Context + state)
  hooks/
    use-punch-data.ts         CRUD + live status for local punch entries
    use-portal-day.ts         Single-day portal data selector
    use-portal-range.ts       Multi-date portal data (week/month)
    use-day-marks.ts          Day mark (mp/fl/hl) load + write
    use-hotkey-settings.ts    Load/save hotkey settings from DB
    use-hotkey-behavior.ts    Push-mode key-release → windowHide
    use-window-size.ts        Responsive breakpoint tracking
  components/
    [see Components section]
  lib/
    types.ts        All TypeScript interfaces
    week-utils.ts   Week math, balance calculation, formatting
    month-utils.ts  Month math, weekday enumeration
    utils.ts        cn() and misc helpers
```

---

## Database Schema

SQLite file at `app.getPath("userData")/data.db`. WAL mode, foreign keys enabled.

### `entries`
Local punch events captured by the monitor or added manually.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `timestamp` | TEXT | UTC ISO-8601 |
| `date` | TEXT | YYYY-MM-DD (local) |
| `type` | TEXT | `LOGIN` or `LOGOUT` |
| `source` | TEXT | `auto` / `manual` / `estimated` |
| `trigger_label` | TEXT | e.g. `via lock`, `via unlock`, `via boot` |
| `notes` | TEXT | nullable |
| `created_at` | TEXT | ISO timestamp (default `datetime('now')`) |
| `modified_at` | TEXT | Set on edit, null otherwise |

Indexes on `date` and `timestamp`.

### `day_marks`
Per-day absence / special-day markers.

| Column | Type | Notes |
|---|---|---|
| `date` | TEXT PK | YYYY-MM-DD |
| `mark` | TEXT | `mp` (miss punch) / `fl` (full leave) / `hl` (half leave) |

### `settings`
Key-value store for all app settings.

| Key | Default | Description |
|---|---|---|
| `dailyTargetMinutes` | `480` | 8h target |
| `autoStart` | `true` | Launch on boot |
| `startMinimized` | `true` | Start hidden in tray |
| `debounceSeconds` | `15` | Lock/unlock debounce window |
| `heartbeatSeconds` | `60` | Heartbeat write interval |
| `closeToTray` | `true` | Close button hides to tray |
| `hotkeyCombo` | `Alt+Space` | Electron accelerator string |
| `hotkeyMode` | `press` | `press` or `push` |
| `hotkeyEnabled` | `true` | Global hotkey active |
| `hrmsBaseUrl` | `https://...` | Portal API base URL |
| `hrmsEmail` | — | Stored credential |
| `hrmsPassword` | — | Stored credential (encrypted) |

### `portal_cache`
Cached HRMS API responses keyed by date.

| Column | Type | Notes |
|---|---|---|
| `date` | TEXT PK | YYYY-MM-DD |
| `data` | TEXT | JSON stringified `PortalData` |
| `cached_at` | TEXT | ISO timestamp |
| `is_permanent` | INTEGER | `1` if date is > 10 days old |

---

## IPC Channels

All channels are registered in `electron/ipc.ts` and exposed via `window.electronAPI` through `preload.cts`.

### Renderer → Main (invoke)

#### Punch entries
| Channel | Args | Returns | Description |
|---|---|---|---|
| `get-events` | `date: string` | `PunchEntry[]` | Entries for date, ordered timestamp DESC |
| `get-status` | `date?: string` | `PunchStatus` | isIn, lastEntry, totalSecondsToday, eventCount |
| `punch-in` | — | `PunchEntry` | Insert manual LOGIN now |
| `punch-out` | — | `PunchEntry` | Insert manual LOGOUT now |
| `add-entry` | `{date, time, type, notes?}` | `PunchEntry` | Insert entry at given date/time |
| `edit-entry` | `id, {timestamp?, type?, notes?}` | `PunchEntry` | Update entry, sets modified_at |
| `delete-entry` | `id` | void | Delete entry by id |

#### Settings
| Channel | Args | Returns |
|---|---|---|
| `get-settings` | — | `AppSettings` |
| `update-settings` | `Record<string, unknown>` | `AppSettings` |

On `update-settings`, if any hotkey key is included, `registerHotkey()` is re-called immediately.

#### Day marks
| Channel | Args | Returns |
|---|---|---|
| `get-day-marks` | — | `{date, mark}[]` |
| `set-day-mark` | `date, mark` | void |
| `delete-day-mark` | `date` | void |

#### HRMS portal
| Channel | Args | Returns |
|---|---|---|
| `hrms-login` | `email, password, baseUrl?` | `{success, message?, userName?, userId?}` |
| `hrms-logout` | — | void |
| `hrms-get-status` | — | `HrmsConnectionStatus` |
| `hrms-get-hours` | `date?` | `PortalData` |

#### Portal cache
| Channel | Args | Returns | Description |
|---|---|---|---|
| `portal-get-day` | `date, force?` | `PortalDayResult` | Fetch single day (uses cache unless forced) |
| `portal-get-range` | `dates[], force?` | `PortalRangeResult[]` | Batch fetch |
| `portal-cache-status` | `date` | `PortalCacheStatus` | Cache metadata for date |
| `portal-cache-invalidate` | `dates[]` | void | Remove dates from cache |
| `portal-cache-invalidate-all` | — | void | Wipe entire cache |
| `portal-cache-populate` | `dates[]` | `{date, success}[]` | Force-refresh and cache a range |

#### Window
| Channel | Args | Returns |
|---|---|---|
| `window-hide` | — | void |

### Main → Renderer (broadcast)

| Channel | Payload | When |
|---|---|---|
| `event-update` | — | After any DB entry change (monitor, punch, add, edit, delete) |
| `hotkey:push-show` | `triggerKey: string` | Push-mode hotkey pressed; sends key name (e.g. `"Space"`) |

---

## Data Types

```typescript
type EntryType    = "LOGIN" | "LOGOUT"
type EntrySource  = "auto" | "manual" | "estimated"
type EntryTrigger = "via boot" | "via unlock" | "via resume" | "via manual"
                  | "via lock" | "via shutdown" | "via sleep"
                  | "via estimated" | "via quit"

interface PunchEntry {
  id: number
  timestamp: string       // UTC ISO-8601
  date: string            // YYYY-MM-DD local
  type: EntryType
  source: EntrySource
  trigger: EntryTrigger
  notes: string | null
  created_at: string
  modified_at: string | null
}

interface PunchStatus {
  isIn: boolean
  lastEntry: PunchEntry | null
  totalSecondsToday: number
  eventCount: number
}

interface WeekDaySummary {
  date: string
  totalSeconds: number
  eventCount: number
  missPunchCount: number
}

interface AppSettings {
  dailyTargetMinutes: number
  autoStart: boolean
  startMinimized: boolean
  debounceSeconds: number
  heartbeatSeconds: number
  closeToTray: boolean
  hotkeyCombo: string
  hotkeyMode: "press" | "push"
  hotkeyEnabled: boolean
}

interface PortalEntry {
  empid: number
  logdate: string
  intime: string
  outtime: string | null    // null = active session
  workingmins: number | null
  ismanual: number
}

interface PortalData {
  success: boolean
  entries: PortalEntry[]
  totalMinutes: number
  isCurrentlyIn: boolean
  lastInTime: string | null
  activeSessionMinutes: number
  message?: string
}

interface HrmsConnectionStatus {
  connected: boolean
  userName: string | null
  userId: number | null
  hasCredentials: boolean
}
```

---

## Portal Cache System

**File:** `electron/portal-cache.ts`

Portal API responses are cached in SQLite to reduce network requests and support offline viewing.

**Permanence rule:** Dates older than 10 days are marked `is_permanent = 1`. Permanent entries are never invalidated automatically — biometric data from that far back is immutable.

**Fetch logic** (in `ipc.ts` → `fetchAndCacheDay(date, force)`):
1. If `is_permanent` → always serve from cache, skip API call
2. If not forced and cache exists → serve from cache
3. Otherwise → call HRMS API, store result, return with `fromCache: false`

**Two-tier cache:**
- **RAM** — `PortalStoreContext.cache` (`Record<date, DayCacheEntry>`) — in-memory for the session
- **SQLite** — `portal_cache` table — persists across restarts

---

## Context: PortalStoreContext

**File:** `src/contexts/portal-store.tsx`  
**Provider location:** Root of `App.tsx`, wraps all layouts.

Single source of truth for all HRMS portal data in the renderer.

### State

| Field | Type | Description |
|---|---|---|
| `status` | `HrmsConnectionStatus` | Login state, userId, userName |
| `cache` | `Record<string, DayCacheEntry>` | All fetched portal days |
| `syncing` | `Set<string>` | Dates with in-flight fetches |
| `errors` | `Record<string, string>` | Per-date error messages |
| `liveTick` | `number` | Increments every 60s; drives live session minute updates |
| `connected` | `boolean` | Derived: `status.connected \|\| status.hasCredentials` |

### Methods

| Method | Description |
|---|---|
| `refreshDay(date, force?)` | Fetch single date, update cache in RAM |
| `refreshRange(dates[], force?)` | Batch fetch; skips dates already syncing |
| `login(email, password, baseUrl?)` | Authenticate, persist credentials, refresh status |
| `logout()` | Clear token, wipe RAM cache and errors |
| `invalidateDay(date)` | Remove single date from RAM cache |
| `invalidateAll()` | Wipe entire RAM cache |
| `populateDates(dates[])` | Force-refresh a range (e.g. after login) |

### Auto-behaviors
- **On mount** — fetches `hrmsGetStatus()` to restore connection state
- **Live tick** — `setInterval(60_000)` increments `liveTick`; portal hooks use this to recompute active-session minutes without re-fetching
- **Window focus** — throttled (60s) re-fetch of non-permanent cached dates when window regains focus

---

## Hooks

### `usePunchData(date?)`
Local punch data for a single date. Falls back to mock data outside Electron.

**Returns:** `status, events, loading, lastUpdated, isToday, punchIn, punchOut, addEntry, editEntry, deleteEntry, refresh`

- Listens to `event-update` IPC broadcasts → calls `refresh()`
- Live timer: `setInterval(1s)` increments `totalSecondsToday` when `isIn && isToday`

### `usePortalDay(date?)`
Thin selector over `PortalStoreContext` for a single date.

- Triggers `store.refreshDay()` on mount and when `store.connected` changes
- 5-minute `setInterval` auto-refresh when viewing today
- Live active-session minutes derived from `liveTick + lastInTime` — no re-fetch needed

### `usePortalRange(dates[])`
Multi-date portal data for weekly/monthly views. Calls `store.refreshRange()`.

**Returns:** `summaries: WeekDaySummary[]`

### `useDayMarks()`
Loads all day marks on mount. Provides `cycleMark(date)` which rotates `mp → fl → hl → (none)`.

### `useHotkeySettings()`
Loads hotkey settings from DB via `getSettings()`. Saves via `updateSettings()`.

### `useHotkeyBehavior()`
Registered at root (`App.tsx`). Listens for `hotkey:push-show`, then attaches `keyup` listener with 50ms delay to detect trigger key release, then calls `windowHide()`.

### `useWindowSize()`
Returns `{width, height}` via ResizeObserver. Used by App.tsx to pick layout.

---

## Layout System

**Defined in `App.tsx`:**

```
WIDE_BREAKPOINT       = 860px
ULTRA_WIDE_BREAKPOINT = 1200px
```

| Width | Layout | Panels |
|---|---|---|
| < 860px | `NarrowLayout` | Single column: header + portal + local status + entry form + log |
| 860–1199px | `WideLayout` | Left: weekly calendar + stats · Right (480px): day view |
| ≥ 1200px | `UltraWideLayout` | Left (300px): monthly calendar + insights · Middle: weekly · Right (480px): day view |

`selectedDate` and `dayMarks` state live in `App.tsx` and survive layout transitions.

Portal blur overlays (absolute-positioned, `backdrop-blur`) appear over the left and middle panels when `!store.connected`.

---

## Hotkey System

**Files:** `electron/hotkey.ts`, `src/hooks/use-hotkey-behavior.ts`

### Press mode (`"press"`)
1. Hotkey pressed → `globalShortcut` callback fires
2. If window visible and focused → `win.hide()`
3. Otherwise → `win.show()` + `win.focus()`

### Push mode (`"push"`)
1. Hotkey pressed → `win.show()` + `win.focus()`
2. Main broadcasts `hotkey:push-show` with trigger key name (e.g. `"Space"`)
3. Renderer (`useHotkeyBehavior`) receives event, waits 50ms, attaches `keyup` listener
4. When trigger key released → `window.electronAPI.windowHide()` → IPC → `win.hide()`
5. Listener removed after first match

### Settings update flow
`updateSettings({ hotkeyCombo, hotkeyMode, hotkeyEnabled })` → IPC → main re-calls `registerHotkey()` with new values immediately — no restart needed.

---

## Startup Sequence

1. `app.whenReady()` → `initDatabase()` → `createWindow()`
2. Load hotkey settings from DB → `registerHotkey()`
3. Register IPC handlers → `startMonitor()` → `startHeartbeat()`
4. Check heartbeat file: if app crashed, insert estimated LOGOUT entry
5. `mainWindow.on("ready-to-show")` → show window (or hide if `startMinimized`)
6. Single-instance lock: second launch → focus existing window + quit

---

## Monitor Flow (Auto Entries)

**File:** `electron/monitor.ts`  
Uses Electron's `powerMonitor` API.

| OS Event | Entry inserted |
|---|---|
| `lock-screen` | `LOGOUT`, trigger `via lock` |
| `unlock-screen` | `LOGIN`, trigger `via unlock` |
| `suspend` | `LOGOUT`, trigger `via sleep` |
| `resume` | `LOGIN`, trigger `via resume` |
| `shutdown` | `LOGOUT`, trigger `via shutdown` |

**Debounce:** Lock and unlock events within `debounceSeconds` of each other are collapsed (prevents duplicate entries from screen-off sequences).

After each insert: `notifyRenderer()` → broadcasts `event-update` → all `usePunchData` hooks refresh.
