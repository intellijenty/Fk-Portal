// Generate simple PNG tray icons as raw RGBA buffers
// Run: node scripts/generate-icons.js

import fs from "fs"
import path from "path"
import zlib from "zlib"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resourcesDir = path.join(__dirname, "..", "resources")

fs.mkdirSync(resourcesDir, { recursive: true })

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, "ascii")
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function createPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const ihdrChunk = createChunk("IHDR", ihdr)

  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = y * (1 + width * 4) + 1 + x * 4
      rawData[dstIdx] = rgba[srcIdx]
      rawData[dstIdx + 1] = rgba[srcIdx + 1]
      rawData[dstIdx + 2] = rgba[srcIdx + 2]
      rawData[dstIdx + 3] = rgba[srcIdx + 3]
    }
  }

  const compressed = zlib.deflateSync(rawData)
  const idatChunk = createChunk("IDAT", compressed)
  const iendChunk = createChunk("IEND", Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createCircleIcon(size, r, g, b) {
  const rgba = new Uint8Array(size * size * 4)
  const center = size / 2
  const radius = size / 2 - 1

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center + 0.5
      const dy = y - center + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * size + x) * 4

      if (dist <= radius) {
        const alpha = Math.min(1, radius - dist + 0.5)
        rgba[idx] = r
        rgba[idx + 1] = g
        rgba[idx + 2] = b
        rgba[idx + 3] = Math.round(alpha * 255)
      }
    }
  }

  return rgba
}

// Tray icons (16x16)
const size = 16
const greenRgba = createCircleIcon(size, 34, 197, 94)
fs.writeFileSync(path.join(resourcesDir, "tray-in.png"), createPng(size, size, greenRgba))

const redRgba = createCircleIcon(size, 239, 68, 68)
fs.writeFileSync(path.join(resourcesDir, "tray-out.png"), createPng(size, size, redRgba))

// App icon (256x256)
const appSize = 256
const appRgba = createCircleIcon(appSize, 34, 197, 94)
fs.writeFileSync(path.join(resourcesDir, "icon.png"), createPng(appSize, appSize, appRgba))

console.log("Icons generated in resources/")
