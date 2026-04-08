import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://roimaint.in:7000/api")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleLogin() {
    setError(null)
    setSubmitting(true)
    try {
      const result = await onLogin(
        email,
        password,
        showAdvanced ? baseUrl : undefined
      )
      if (result.success) {
        setOpen(false)
        setEmail("")
        setPassword("")
        setError(null)
      } else {
        setError(result.message || "Login failed")
      }
    } finally {
      setSubmitting(false)
    }
  }

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
        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              placeholder="user@roimaint.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && password) handleLogin()
              }}
            />
          </div>
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              Advanced
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Base URL
                </label>
                <Input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={submitting || !email || !password}
          >
            {submitting ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
