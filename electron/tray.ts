import { Tray, Menu, nativeImage, BrowserWindow } from "electron"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray: Tray | null = null
let isIn = false

function getIconPath(status: "in" | "out"): string {
  const iconName = status === "in" ? "icon-green.png" : "icon-red.png"
  // In dev: resources/ is at project root; in prod: it's in app.getAppPath()
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(__dirname, "..", "resources", iconName)
  }
  return path.join(process.resourcesPath, iconName)
}

function createTrayIcon(status: "in" | "out"): Electron.NativeImage {
  return nativeImage.createFromPath(getIconPath(status))
}

function buildContextMenu(
  mainWindow: BrowserWindow | null,
  onPunchIn: () => void,
  onPunchOut: () => void,
  onQuit: () => void
): Menu {
  return Menu.buildFromTemplate([
    {
      label: "Show Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: "separator" },
    {
      label: "Punch IN",
      enabled: !isIn,
      click: onPunchIn,
    },
    {
      label: "Punch OUT",
      enabled: isIn,
      click: onPunchOut,
    },
    { type: "separator" },
    {
      label: "Quit",
      click: onQuit,
    },
  ])
}

export function createTray(
  mainWindow: BrowserWindow | null,
  onPunchIn: () => void,
  onPunchOut: () => void,
  onQuit: () => void
): Tray {
  const icon = createTrayIcon("out")
  tray = new Tray(icon)

  tray.setToolTip("Traccia - OUT")
  tray.setContextMenu(
    buildContextMenu(mainWindow, onPunchIn, onPunchOut, onQuit)
  )

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  return tray
}

export function updateTrayStatus(
  status: "in" | "out",
  timeStr: string,
  mainWindow: BrowserWindow | null,
  onPunchIn: () => void,
  onPunchOut: () => void,
  onQuit: () => void
): void {
  if (!tray) return

  isIn = status === "in"
  const icon = createTrayIcon(status)
  tray.setImage(icon)

  const statusText = status === "in" ? "IN" : "OUT"
  tray.setToolTip(`Traccia - ${statusText} | Today: ${timeStr}`)

  tray.setContextMenu(
    buildContextMenu(mainWindow, onPunchIn, onPunchOut, onQuit)
  )
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
