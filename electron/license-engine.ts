import { execSync } from "child_process"
import { createHmac } from "crypto"

export class LicenseEngine {
  private readonly salt: string

  constructor() {
    this.salt = "thenameisyash"
  }
  public getHardwareId(): string {
    try {
      const cmd =
        'powershell.exe -ExecutionPolicy Bypass -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"'
      const output = execSync(cmd).toString().trim()

      if (!output || output.includes("00000000")) {
        return "FALLBACK-DEVICE-ID-999"
      }
      return output
    } catch {
      return "UNAVAILABLE-HARDWARE-ID"
    }
  }

  public generateKey(hwid: string): string {
    return createHmac("sha256", this.salt)
      .update(hwid)
      .digest("hex")
      .substring(0, 16)
      .toUpperCase()
  }

  public verify(userKey: string): boolean {
    if (!userKey) return false
    const expected = this.generateKey(this.getHardwareId())
    return userKey.trim().toUpperCase() === expected
  }
}
