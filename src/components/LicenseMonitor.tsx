import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "./ui/spinner"
import { CopyButton } from "./copy-button"

const LicenseMonitor = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [hwid, setHwid] = useState("")
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const [status, id] = await Promise.all([
        window.licenseAPI.checkStatus(),
        window.licenseAPI.getHwid(),
      ])
      setIsAuthorized(status)
      setHwid(id)
    }
    init()
  }, [])

  const handleActivate = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await window.licenseAPI.submitLicense(key)

      if (result.success) {
        setIsAuthorized(true)
      } else {
        setError(result.message || "Invalid license key")
      }
    } finally {
      setLoading(false)
    }
  }

  // still checking → block UI
  if (isAuthorized === null) {
    return null
  }

  return (
    <Dialog open={!isAuthorized} modal>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
        overlayBlur="supports-backdrop-filter:backdrop-blur-2xl"
      >
        <DialogHeader>
          <DialogTitle>Unlock this app</DialogTitle>
          <DialogDescription>
            Device activation is required. Copy the ID below and send it to the
            administrator to obtain your activation key.
          </DialogDescription>
        </DialogHeader>

        <CopyButton
          text={hwid}
          variant={"outline"}
          size={"lg"}
          className="will-change-transform"
        >
          {hwid}
        </CopyButton>

        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="p-5"
          placeholder="Enter your activation key here"
        />

        {/* Error */}
        {error && <p className="mx-auto text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleActivate}
            disabled={loading || !key}
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner className="size-4" />
                {"Verifying activation key"}
              </>
            ) : (
              "Activate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LicenseMonitor
