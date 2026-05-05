import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HrmsLoginForm } from "./hrms-login-form"

interface HrmsLoginProps {
  onLogin: (
    email: string,
    password: string,
    baseUrl?: string
  ) => Promise<{ success: boolean; message?: string }>
  onLogout?: () => Promise<void>
  connected?: boolean
}

export function HrmsLogin({ onLogin, onLogout, connected }: HrmsLoginProps) {
  const [open, setOpen] = useState(false)

  if (connected && onLogout) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onLogout}
      >
        Disconnect
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect to Portal</DialogTitle>
        </DialogHeader>
        <HrmsLoginForm onLogin={onLogin} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
