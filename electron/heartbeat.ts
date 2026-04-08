import fs from "fs"
import path from "path"
import { app } from "electron"

let heartbeatInterval: ReturnType<typeof setInterval> | null = null
let heartbeatPath: string

function getHeartbeatPath(): string {
  if (!heartbeatPath) {
    heartbeatPath = path.join(app.getPath("userData"), "heartbeat.json")
  }
  return heartbeatPath
}

export function writeHeartbeat(): void {
  const data = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
  }
  try {
    fs.writeFileSync(getHeartbeatPath(), JSON.stringify(data), "utf-8")
  } catch {
    // Silently fail — heartbeat is best-effort
  }
}

export function readHeartbeat(): { timestamp: string; pid: number } | null {
  try {
    const raw = fs.readFileSync(getHeartbeatPath(), "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearHeartbeat(): void {
  try {
    fs.unlinkSync(getHeartbeatPath())
  } catch {
    // File may not exist
  }
}

export function startHeartbeat(intervalSeconds: number): void {
  stopHeartbeat()
  writeHeartbeat()
  heartbeatInterval = setInterval(() => {
    writeHeartbeat()
  }, intervalSeconds * 1000)
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}
