import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { app } from "electron"

let db: Database.Database

export interface DBEntry {
  id: number
  timestamp: string
  date: string
  type: "LOGIN" | "LOGOUT"
  source: "auto" | "manual" | "estimated"
  trigger: string
  notes: string | null
  created_at: string
  modified_at: string | null
}

function getDbPath(): string {
  const userDataPath = app.getPath("userData")
  fs.mkdirSync(userDataPath, { recursive: true })
  return path.join(userDataPath, "data.db")
}

export function initDatabase(): void {
  const dbPath = getDbPath()
  db = new Database(dbPath)

  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('LOGIN', 'LOGOUT')),
      source TEXT NOT NULL CHECK(source IN ('auto', 'manual', 'estimated')),
      trigger_label TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Insert default settings if not exist
  const defaults: Record<string, string> = {
    dailyTargetMinutes: "480",
    autoStart: "true",
    startMinimized: "true",
    debounceSeconds: "15",
    heartbeatSeconds: "60",
    closeToTray: "true",
    hrmsBaseUrl: "https://roimaint.in:7000/api",
  }

  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  )
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value)
  }
}

export function insertEntry(
  type: "LOGIN" | "LOGOUT",
  source: "auto" | "manual" | "estimated",
  triggerLabel: string,
  timestamp?: string,
  notes?: string | null
): DBEntry {
  const now = timestamp || new Date().toISOString()
  const localDate = new Date(now).toLocaleDateString("en-CA") // YYYY-MM-DD

  const stmt = db.prepare(`
    INSERT INTO entries (timestamp, date, type, source, trigger_label, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(now, localDate, type, source, triggerLabel, notes || null)

  return getEntryById(result.lastInsertRowid as number)!
}

export function getEntryById(id: number): DBEntry | undefined {
  return db.prepare("SELECT * FROM entries WHERE id = ?").get(id) as
    | DBEntry
    | undefined
}

export function getEntriesByDate(date: string): DBEntry[] {
  return db
    .prepare("SELECT * FROM entries WHERE date = ? ORDER BY timestamp DESC, id DESC")
    .all(date) as DBEntry[]
}

export function getLastEntry(): DBEntry | undefined {
  return db
    .prepare("SELECT * FROM entries ORDER BY id DESC LIMIT 1")
    .get() as DBEntry | undefined
}

export function getLastEntryByDate(date: string): DBEntry | undefined {
  return db
    .prepare(
      "SELECT * FROM entries WHERE date = ? ORDER BY timestamp DESC, id DESC LIMIT 1"
    )
    .get(date) as DBEntry | undefined
}

export function updateEntry(
  id: number,
  updates: { timestamp?: string; type?: string; notes?: string }
): DBEntry {
  const entry = getEntryById(id)
  if (!entry) throw new Error(`Entry ${id} not found`)

  const newTimestamp = updates.timestamp || entry.timestamp
  const newDate = new Date(newTimestamp).toLocaleDateString("en-CA")
  const newType = updates.type || entry.type
  const newNotes = updates.notes !== undefined ? updates.notes : entry.notes

  db.prepare(`
    UPDATE entries
    SET timestamp = ?, date = ?, type = ?, notes = ?, modified_at = datetime('now')
    WHERE id = ?
  `).run(newTimestamp, newDate, newType, newNotes, id)

  return getEntryById(id)!
}

export function deleteEntry(id: number): void {
  db.prepare("DELETE FROM entries WHERE id = ?").run(id)
}

export function calculateTotalSecondsForDate(date: string): number {
  const entries = db
    .prepare(
      "SELECT * FROM entries WHERE date = ? ORDER BY timestamp ASC, id ASC"
    )
    .all(date) as DBEntry[]

  let totalSeconds = 0
  let loginTime: Date | null = null

  for (const entry of entries) {
    if (entry.type === "LOGIN") {
      loginTime = new Date(entry.timestamp)
    } else if (entry.type === "LOGOUT" && loginTime) {
      const logoutTime = new Date(entry.timestamp)
      totalSeconds += (logoutTime.getTime() - loginTime.getTime()) / 1000
      loginTime = null
    }
  }

  // If currently logged in, add time until now
  if (loginTime) {
    const now = new Date()
    totalSeconds += (now.getTime() - loginTime.getTime()) / 1000
  }

  return Math.max(0, Math.floor(totalSeconds))
}

export function getEventCountForDate(date: string): number {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM entries WHERE date = ?")
    .get(date) as { count: number }
  return result.count
}

export function getSetting(key: string): string | undefined {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value
  )
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string
    value: string
  }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}
