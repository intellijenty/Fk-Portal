import { useState, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { migratePlainTextSignature } from '@/lib/eod-utils'
import type { EodEmailSettings } from '@/lib/eod-types'
import { SignatureEditor } from '@/components/eod/signature-editor'

const STORAGE_KEY = 'traccia:eod-settings'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function isValidEmail(e: string) {
  return EMAIL_RE.test(e)
}

export function loadEodSettings(): EodEmailSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      return {
        to: (p.to as string) || '',
        cc: Array.isArray(p.cc)
          ? (p.cc as string[])
          : typeof p.cc === 'string' && p.cc
          ? [p.cc]
          : [],
        signature: migratePlainTextSignature((p.signature as string) || ''),
        embedSignature: typeof p.embedSignature === 'boolean' ? p.embedSignature : true,
      }
    }
  } catch { /* ignore */ }
  return { to: '', cc: [], signature: '', embedSignature: true }
}

export function saveEodSettings(s: EodEmailSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: EodEmailSettings
  onSave: (s: EodEmailSettings) => void
}

export function EodSettingsDialog({ open, onOpenChange, settings, onSave }: Props) {
  const [toInput, setToInput] = useState(settings.to)
  const [ccChips, setCcChips] = useState<string[]>(settings.cc)
  const [ccInput, setCcInput] = useState('')
  const [ccError, setCcError] = useState('')
  const [toError, setToError] = useState('')
  const [signature, setSignature] = useState(settings.signature)
  const [embedSignature, setEmbedSignature] = useState(settings.embedSignature ?? true)
  const ccRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setToInput(settings.to)
      setCcChips(settings.cc)
      setCcInput('')
      setCcError('')
      setToError('')
      setSignature(settings.signature)
      setEmbedSignature(settings.embedSignature ?? true)
    }
  }, [open, settings])

  function tryAddCc(raw: string): boolean {
    setCcError('')
    const parts = raw.split(/[,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
    if (!parts.length) return false
    const invalid = parts.filter(e => !isValidEmail(e))
    if (invalid.length) { setCcError(`Invalid: ${invalid.join(', ')}`); return false }
    const fresh = parts.filter(e => !ccChips.some(c => c.toLowerCase() === e.toLowerCase()))
    if (!fresh.length) { setCcError('Already added'); return false }
    setCcChips(prev => [...prev, ...fresh])
    setCcInput('')
    setTimeout(() => ccRef.current?.focus(), 0)
    return true
  }

  function handleCcKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      tryAddCc(ccInput)
    }
    if (e.key === 'Backspace' && ccInput === '' && ccChips.length > 0) {
      setCcChips(prev => prev.slice(0, -1))
    }
  }

  function handleSave() {
    if (ccInput.trim()) {
      const ok = tryAddCc(ccInput)
      if (!ok) return
    }
    const resolvedTo = toInput.trim().toLowerCase()
    if (resolvedTo && !isValidEmail(resolvedTo)) {
      setToError('Invalid email address')
      return
    }
    setToError('')
    const s: EodEmailSettings = {
      to: resolvedTo,
      cc: ccChips,
      signature,
      embedSignature,
    }
    onSave(s)
    saveEodSettings(s)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="md:max-w-lg gap-0 overflow-hidden p-0">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Saved locally in your browser</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close settings"
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">

          {/* TO */}
          <div className="space-y-1.5">
            <label htmlFor="eod-to" className="block text-sm font-medium">To</label>
            <Input
              id="eod-to"
              type="email"
              name="toEmail"
              autoComplete="off"
              spellCheck={false}
              value={toInput}
              onChange={e => { setToInput(e.target.value); setToError('') }}
              placeholder="manager@company.com"
              aria-invalid={toError ? true : undefined}
            />
            {toError && (
              <p className="text-xs text-destructive" aria-live="polite">{toError}</p>
            )}
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <label htmlFor="eod-cc" className="block text-sm font-medium">CC</label>

            {ccChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ccChips.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    <span className="max-w-48 truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => setCcChips(prev => prev.filter(e => e !== email))}
                      aria-label={`Remove ${email}`}
                      className="rounded p-0.5 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring outline-none"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={ccRef}
                id="eod-cc"
                type="email"
                name="ccEmail"
                autoComplete="off"
                spellCheck={false}
                className="flex-1"
                value={ccInput}
                onChange={e => { setCcInput(e.target.value); setCcError('') }}
                onKeyDown={handleCcKeyDown}
                placeholder="email@company.com"
                aria-invalid={ccError ? true : undefined}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => tryAddCc(ccInput)}
                disabled={!ccInput.trim()}
                aria-label="Add CC email"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {ccError ? (
              <p className="text-xs text-destructive" aria-live="polite">{ccError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Press Enter or comma to add multiple</p>
            )}
          </div>

          {/* Embed signature toggle */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-sm font-medium">Include Signature in Email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disable if Outlook adds your signature automatically
              </p>
            </div>
            <Switch
              checked={embedSignature}
              onCheckedChange={setEmbedSignature}
              aria-label="Include signature in email"
            />
          </div>

          {/* Signature */}
          {embedSignature && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Outlook Signature</p>
              <SignatureEditor value={signature} onChange={setSignature} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
