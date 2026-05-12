import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'

type KeyPart = string | { text: string }

type ShortcutEntry = {
  location?: string
  keys: KeyPart[]
  action: string
}

const FORM_SHORTCUTS: ShortcutEntry[] = [
  { location: 'Project',      keys: ['Enter', { text: '/' }, 'Tab'], action: 'Focus first task (create if none)' },
  { location: 'Task',         keys: ['Enter'],                        action: 'New task below' },
  { location: 'Task',         keys: ['Tab'],                          action: 'Indent → add / focus sub-bullet' },
  { location: 'Task',         keys: ['↑', '↓'],                      action: 'Navigate' },
  { location: 'Task',         keys: ['⌫', { text: 'empty' }],        action: 'Delete task, focus prev' },
  { location: 'Sub-bullet',   keys: ['Enter'],                        action: 'New sub-bullet below' },
  { location: 'Sub-bullet',   keys: ['Ctrl', 'Enter'],                action: 'New task after parent' },
  { location: 'Sub-bullet',   keys: ['⇧', 'Tab'],                    action: 'Back to parent task' },
  { location: 'Sub-bullet',   keys: ['↑', '↓'],                      action: 'Navigate' },
  { location: 'Sub-bullet',   keys: ['⌫', { text: 'empty' }],        action: 'Delete, focus prev' },
  { location: 'N/A badge',    keys: ['Enter'],                        action: 'Start editing section' },
  { location: 'Section item', keys: ['Enter'],                        action: 'New item below' },
  { location: 'Section item', keys: ['↑', '↓'],                      action: 'Navigate' },
  { location: 'Section item', keys: ['⌫', { text: 'empty' }],        action: 'Delete, set N/A if last' },
]

const PAGE_SHORTCUTS: ShortcutEntry[] = [
  { keys: ['Ctrl', '⇧', 'O'], action: 'Open in Outlook' },
  { keys: ['Ctrl', '⇧', 'R'], action: 'Restore Last Sent' },
  { keys: ['Ctrl', '⇧', 'S'], action: 'Open Settings' },
]

function KeyDisplay({ keys }: { keys: KeyPart[] }) {
  return (
    <KbdGroup>
      {keys.map((p, i) =>
        typeof p === 'string' ? (
          <Kbd key={i}>{p}</Kbd>
        ) : (
          <span key={i} className="px-0.5 text-[10px] text-muted-foreground/50">{p.text}</span>
        )
      )}
    </KbdGroup>
  )
}

function ShortcutTable({ entries }: { entries: ShortcutEntry[] }) {
  return (
    <div className="divide-y divide-border/30">
      {entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[125px_1fr_auto] items-center gap-6 py-2.5">
          {
            entry.location && 
              <span className="text-xs text-muted-foreground truncate">
                {entry.location}
              </span>
          }
          <span className="text-sm text-foreground">{entry.action}</span>
          <KeyDisplay keys={entry.keys} />
        </div>
      ))}
    </div>
  )
}

interface EodKeyboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EodKeyboardDialog({ open, onOpenChange }: EodKeyboardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex w-full md:max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        <div className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Keyboard Shortcuts
          </DialogTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            EOD form editor and page shortcuts
          </p>
        </div>

        <Separator />

        <div className="no-scrollbar overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex gap-20 space-y-6 px-6 py-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Page
              </p>
              <ShortcutTable entries={PAGE_SHORTCUTS} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Form Editor
              </p>
              <ShortcutTable entries={FORM_SHORTCUTS} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
