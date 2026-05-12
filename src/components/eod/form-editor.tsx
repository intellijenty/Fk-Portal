import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { makeId, makeEmptyTask } from '@/lib/eod-types'
import type { EodFormState, ProjectStatus } from '@/lib/eod-types'
import { Button } from '../ui/button'
import { Kbd, KbdGroup } from '../ui/kbd'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

// ── Types ────────────────────────────────────────────────────────────────────

export type FormLayoutMode = 'comfortable' | 'focused' | 'zen'

interface FormEditorProps {
  value: EodFormState
  onChange: (v: EodFormState) => void
  mode?: FormLayoutMode
}

type SectionKey = 'otherTasks' | 'concerns' | 'nextDayPlan' | 'upcomingHolidays'

// ── Status picker ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { status: ProjectStatus; color: string; label: string }[] = [
  { status: 'green', color: '#00FF00', label: 'Green' },
  { status: 'yellow', color: '#FFFF00', label: 'Yellow' },
  { status: 'red', color: '#FF0000', label: 'Red' },
  { status: 'none', color: '', label: 'None' },
]

function ProjectStatusPicker({
  value,
  onChange,
}: {
  value: ProjectStatus
  onChange: (v: ProjectStatus) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {STATUS_OPTIONS.map(o => (
        <Tooltip delayDuration={200}>
          <TooltipTrigger>
            <button
              key={o.status}
              type="button"
              onClick={() => onChange(o.status)}
              aria-label={o.label}
              className={cn(
                'size-3 rounded-full border transition-all',
                value === o.status
                  ? 'ring-2 ring-offset-1 ring-foreground/30 scale-105'
                  : 'opacity-40 hover:opacity-80',
                o.status === 'none' ? 'border-2 border-primary-foreground' : 'border-transparent',
              )}
              style={o.color ? { backgroundColor: o.color } : {}}
            />
          </TooltipTrigger>
          <TooltipContent>
            {o.label}
          </TooltipContent>
        </Tooltip>
        
      ))}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FormEditor({ value, onChange, mode = 'comfortable' }: FormEditorProps) {
  // Flat map of all focusable elements keyed by focus key
  const inputRefs = useRef<Map<string, HTMLElement>>(new Map())
  // Key to focus after next render (used when new items are created)
  const pendingFocus = useRef<string | null>(null)



  // After every render: apply pending focus
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = inputRefs.current.get(pendingFocus.current)
    if (el) {
      el.focus()
      if (el instanceof HTMLInputElement) {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
      pendingFocus.current = null
    }
  })

  // Register a focusable element ref for a given focus key
  function reg(key: string) {
    return (el: HTMLElement | null) => {
      if (el) inputRefs.current.set(key, el)
      else inputRefs.current.delete(key)
    }
  }

  // Immediately focus by key, or defer to next render
  function focus(key: string) {
    const el = inputRefs.current.get(key)
    if (!el) { pendingFocus.current = key; return }
    el.focus()
    if (el instanceof HTMLInputElement) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }

  // Build ordered flat list of all focusable keys for arrow navigation
  function getOrderedKeys(): string[] {
    const keys: string[] = ['project']
    for (const task of value.tasksCompleted) {
      keys.push(`task:${task.id}`)
      for (const sub of task.subBullets) {
        keys.push(`sub:${task.id}:${sub.id}`)
      }
    }
    for (const sk of ['otherTasks', 'concerns', 'nextDayPlan', 'upcomingHolidays'] as const) {
      const s = value[sk]
      if (s.isNA) {
        keys.push(`na:${sk}`)
      } else {
        for (const item of s.items) {
          keys.push(`section:${sk}:${item.id}`)
        }
      }
    }
    return keys
  }

  function focusPrev(key: string) {
    const keys = getOrderedKeys()
    const idx = keys.indexOf(key)
    if (idx > 0) focus(keys[idx - 1])
  }

  function focusNext(key: string) {
    const keys = getOrderedKeys()
    const idx = keys.indexOf(key)
    if (idx >= 0 && idx < keys.length - 1) focus(keys[idx + 1])
  }

  // ── Project keyboard ────────────────────────────────────────────────────────

  function handleProjectKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusNext('project')
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      if (value.tasksCompleted.length > 0) {
        focus(`task:${value.tasksCompleted[0].id}`)
      } else {
        const t = makeEmptyTask()
        pendingFocus.current = `task:${t.id}`
        onChange({ ...value, tasksCompleted: [t] })
      }
    }
  }

  // ── Task keyboard ───────────────────────────────────────────────────────────

  function addTaskAfter(afterId: string | null) {
    const t = makeEmptyTask()
    pendingFocus.current = `task:${t.id}`
    if (afterId === null) {
      onChange({ ...value, tasksCompleted: [...value.tasksCompleted, t] })
    } else {
      const tasks = value.tasksCompleted
      const idx = tasks.findIndex(t2 => t2.id === afterId)
      onChange({ ...value, tasksCompleted: [...tasks.slice(0, idx + 1), t, ...tasks.slice(idx + 1)] })
    }
  }

  function handleTaskKey(taskId: string, text: string, e: React.KeyboardEvent) {
    const task = value.tasksCompleted.find(t => t.id === taskId)
    if (!task) return

    if (e.key === 'Enter') {
      e.preventDefault()
      addTaskAfter(taskId)

    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (task.subBullets.length > 0) {
        focus(`sub:${taskId}:${task.subBullets[0].id}`)
      } else {
        const subId = makeId()
        pendingFocus.current = `sub:${taskId}:${subId}`
        onChange({
          ...value,
          tasksCompleted: value.tasksCompleted.map(t =>
            t.id === taskId ? { ...t, subBullets: [{ id: subId, text: '' }] } : t
          ),
        })
      }

    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault()
      const remaining = value.tasksCompleted.filter(t => t.id !== taskId)
      focusPrev(`task:${taskId}`)
      onChange({ ...value, tasksCompleted: remaining })

    } else if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault()
      focusPrev(`task:${taskId}`)
      removeTask(taskId)

    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusNext(`task:${taskId}`)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusPrev(`task:${taskId}`)
    }
  }

  // ── Sub-bullet keyboard ─────────────────────────────────────────────────────

  function addSubAfter(taskId: string, afterSubId: string) {
    const subId = makeId()
    pendingFocus.current = `sub:${taskId}:${subId}`
    onChange({
      ...value,
      tasksCompleted: value.tasksCompleted.map(t => {
        if (t.id !== taskId) return t
        const idx = t.subBullets.findIndex(s => s.id === afterSubId)
        return {
          ...t,
          subBullets: [
            ...t.subBullets.slice(0, idx + 1),
            { id: subId, text: '' },
            ...t.subBullets.slice(idx + 1),
          ],
        }
      }),
    })
  }

  function handleSubKey(taskId: string, subId: string, text: string, e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      addTaskAfter(taskId)

    } else if (e.key === 'Enter') {
      e.preventDefault()
      addSubAfter(taskId, subId)

    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      focus(`task:${taskId}`)

    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault()
      focusPrev(`sub:${taskId}:${subId}`)
      onChange({
        ...value,
        tasksCompleted: value.tasksCompleted.map(t =>
          t.id === taskId
            ? { ...t, subBullets: t.subBullets.filter(s => s.id !== subId) }
            : t
        ),
      })

    } else if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault()
      focusPrev(`sub:${taskId}:${subId}`)
      removeSub(taskId, subId)

    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusNext(`sub:${taskId}:${subId}`)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusPrev(`sub:${taskId}:${subId}`)
    }
  }

  // ── Simple section keyboard ─────────────────────────────────────────────────

  function addSectionItemAfter(sk: SectionKey, afterId: string | null) {
    const section = value[sk]
    const newId = makeId()
    pendingFocus.current = `section:${sk}:${newId}`
    if (afterId === null) {
      onChange({ ...value, [sk]: { isNA: false, items: [...section.items, { id: newId, text: '' }] } })
    } else {
      const idx = section.items.findIndex(i => i.id === afterId)
      const items = [
        ...section.items.slice(0, idx + 1),
        { id: newId, text: '' },
        ...section.items.slice(idx + 1),
      ]
      onChange({ ...value, [sk]: { ...section, items } })
    }
  }

  function handleSectionItemKey(sk: SectionKey, itemId: string, text: string, e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSectionItemAfter(sk, itemId)

    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault()
      const section = value[sk]
      const items = section.items.filter(i => i.id !== itemId)
      focusPrev(`section:${sk}:${itemId}`)
      onChange({ ...value, [sk]: { items, isNA: items.length === 0 } })

    } else if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault()
      const items = value[sk].items.filter(i => i.id !== itemId)
      focusPrev(`section:${sk}:${itemId}`)
      onChange({ ...value, [sk]: { items, isNA: items.length === 0 } })

    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusNext(`section:${sk}:${itemId}`)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusPrev(`section:${sk}:${itemId}`)
    }
  }

  // ── Update helpers ──────────────────────────────────────────────────────────

  function updateTask(id: string, text: string) {
    onChange({ ...value, tasksCompleted: value.tasksCompleted.map(t => t.id === id ? { ...t, text } : t) })
  }

  function updateSub(taskId: string, subId: string, text: string) {
    onChange({
      ...value,
      tasksCompleted: value.tasksCompleted.map(t =>
        t.id === taskId
          ? { ...t, subBullets: t.subBullets.map(s => s.id === subId ? { ...s, text } : s) }
          : t
      ),
    })
  }

  function removeTask(id: string) {
    onChange({ ...value, tasksCompleted: value.tasksCompleted.filter(t => t.id !== id) })
  }

  function removeSub(taskId: string, subId: string) {
    onChange({
      ...value,
      tasksCompleted: value.tasksCompleted.map(t =>
        t.id === taskId ? { ...t, subBullets: t.subBullets.filter(s => s.id !== subId) } : t
      ),
    })
  }

  function updateSectionItem(sk: SectionKey, itemId: string, text: string) {
    const section = value[sk]
    onChange({ ...value, [sk]: { ...section, items: section.items.map(i => i.id === itemId ? { ...i, text } : i) } })
  }

  // ── SimpleSection component ─────────────────────────────────────────────────

  function renderSimpleSection(sk: SectionKey, placeholder: string) {
    const section = value[sk]

    if (section.isNA) {
      return (
        <div className="flex items-center gap-3">
          <Button
            variant={"outline"}
            size={"xs"}
            ref={reg(`na:${sk}`) as React.RefCallback<HTMLButtonElement>}
            className="text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => addSectionItemAfter(sk, null)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); focusNext(`na:${sk}`) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); focusPrev(`na:${sk}`) }
            }}
          >
            N/A
          </Button>
          {mode !== "zen" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/40">
              Click to edit
            </span>
          )}
        </div>
      )
    }

    return (
      <div>
        {section.items.map(item => (
          <div key={item.id} className="group flex items-center gap-2.5">
            <span className="shrink-0 select-none text-foreground/50 text-xs">●</span>
            <input
              ref={reg(`section:${sk}:${item.id}`) as React.RefCallback<HTMLInputElement>}
              type="text"
              value={item.text}
              onChange={e => updateSectionItem(sk, item.id, e.target.value)}
              onKeyDown={e => handleSectionItemKey(sk, item.id, item.text, e)}
              placeholder={placeholder}
              className="flex-1 min-w-0 bg-transparent py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
            <Button
              variant={"ghost"}
              size={"icon-xs"}
              tabIndex={-1}
              onClick={() => {
                const items = section.items.filter(i => i.id !== item.id)
                onChange({ ...value, [sk]: { items, isNA: items.length === 0 } })
              }}
              aria-label="Remove"
              className="shrink-0 text-sm leading-none opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                className="shrink-0"
              />
            </Button>
          </div>
        ))}
        {mode !== 'zen' && (
          <div className={cn(
            'flex items-center gap-2',
            mode === 'comfortable'
              ? 'pt-1'
              : 'h-7 opacity-0 group-hover/section:opacity-100 group-focus-within/section:opacity-100 transition-opacity duration-150'
          )}>
            <Button
              variant={"outline"}
              size={"xs"}
              tabIndex={-1}
              onClick={() => addSectionItemAfter(sk, section.items[section.items.length - 1]?.id ?? null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add item
            </Button>
            <Button
              variant={"outline"}
              size={"xs"}
              tabIndex={-1}
              onClick={() => onChange({ ...value, [sk]: { items: [], isNA: true } })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Set N/A
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Project */}
      <div className="flex space-x-2 items-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Project</p>
        <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-0.5 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
          {value.projectStatus !== 'none' && (
            <span
              className="h-3.5 w-1 shrink-0 rounded"
              style={{ backgroundColor: STATUS_OPTIONS.find(o => o.status === value.projectStatus)?.color }}
            />
          )}
          <input
            ref={reg('project') as React.RefCallback<HTMLInputElement>}
            type="text"
            value={value.project}
            onChange={e => onChange({ ...value, project: e.target.value })}
            onKeyDown={handleProjectKey}
            placeholder="Project name"
            className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            autoComplete="off"
            name="project"
          />
          <ProjectStatusPicker
            value={value.projectStatus}
            onChange={v => onChange({ ...value, projectStatus: v })}
          />
        </div>
      </div>

      {/* Tasks Completed */}
      <div>
        <div className="flex items-center justify-between">
          <SectionHeader>Tasks Completed</SectionHeader>
          {mode !== 'zen' && <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pb-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Kbd>Enter</Kbd> new item
            </span>
            <span className='text-muted-foreground'>&middot;</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Kbd>Tab</Kbd> indent
            </span>
            <span className='text-muted-foreground'>&middot;</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <KbdGroup><Kbd>Shift</Kbd><Kbd>Tab</Kbd></KbdGroup> unindent
            </span>
            <span className='text-muted-foreground'>&middot;</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <KbdGroup><Kbd>↑</Kbd><Kbd>↓</Kbd></KbdGroup> navigate
            </span>
            <span className='text-muted-foreground'>&middot;</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Kbd>⌫</Kbd> delete (empty)
            </span>
          </div>}
        </div>
        <div className="space-y-1">
          {value.tasksCompleted.map(task => (
            <div key={task.id} className="group/card rounded-lg border border-border/40 bg-muted/5">
              {/* Task row */}
              <div className="group flex items-center gap-2.5 px-4 pt-1.5">
                <span className="shrink-0 select-none text-foreground/50 text-xs">●</span>
                <input
                  ref={reg(`task:${task.id}`) as React.RefCallback<HTMLInputElement>}
                  type="text"
                  value={task.text}
                  onChange={e => updateTask(task.id, e.target.value)}
                  onKeyDown={e => handleTaskKey(task.id, task.text, e)}
                  placeholder="Ticket or task name"
                  className="flex-1 min-w-0 bg-transparent py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
                <Button
                  variant={"ghost"}
                  size={"icon-sm"}
                  tabIndex={-1}
                  onClick={() => removeTask(task.id)}
                  aria-label="Remove task"
                  className="shrink-0 text-sm leading-none opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    className="shrink-0"
                  />
                </Button>
              </div>

              {/* Sub-bullets */}
              {task.subBullets.length > 0 && (
                <div className="px-4 pb-1 space-y-0.5">
                  {task.subBullets.map(sub => (
                    <div key={sub.id} className="group flex items-center gap-2.5 pl-6">
                      <span className="shrink-0 select-none text-foreground/40 text-[10px]">○</span>
                      <input
                        ref={reg(`sub:${task.id}:${sub.id}`) as React.RefCallback<HTMLInputElement>}
                        type="text"
                        value={sub.text}
                        onChange={e => updateSub(task.id, sub.id, e.target.value)}
                        onKeyDown={e => handleSubKey(task.id, sub.id, sub.text, e)}
                        placeholder="Task detail"
                        className="flex-1 min-w-0 bg-transparent py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                      />
                      <Button
                        variant={"ghost"}
                        size={"icon-xs"}
                        tabIndex={-1}
                        onClick={() => removeSub(task.id, sub.id)}
                        aria-label="Remove sub-bullet"
                        className="shrink-0 text-sm leading-none opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          className="shrink-0"
                        />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-bullet hint / add */}
              {mode !== 'zen' && (
                <div className={cn(
                  'flex items-center gap-1 px-4',
                  mode === 'comfortable'
                    ? 'pb-2.5 pt-0.5'
                    : 'h-7 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-150'
                )}>
                  <Button
                    type="button"
                    variant={"outline"}
                    size={"xs"}
                    tabIndex={-1}
                    onClick={() => {
                      const subId = makeId()
                      pendingFocus.current = `sub:${task.id}:${subId}`
                      onChange({
                        ...value,
                        tasksCompleted: value.tasksCompleted.map(t =>
                          t.id === task.id
                            ? { ...t, subBullets: [...t.subBullets, { id: subId, text: '' }] }
                            : t
                        ),
                      })
                    }}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + sub-bullet
                  </Button>
                  <Kbd className="ml-1 h-5 text-xs">
                    {task.subBullets.length === 0 ? "Tab" : "Enter"}
                  </Kbd>
                </div>
              )}
            </div>
          ))}

          {mode !== 'zen' && (
            <div className='flex items-center gap-1'>
              <Button
                tabIndex={-1}
                variant={"outline"}
                size={"sm"}
                onClick={() => addTaskAfter(value.tasksCompleted[value.tasksCompleted.length - 1]?.id ?? null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="shrink-0 size-3 mr-1" />
                <span>Add task</span>
              </Button>
              <KbdGroup className="ml-1">
                <Kbd>Ctrl</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>
            </div>
          )}
        </div>
      </div>

      {/* Other Tasks */}
      <div className="group/section">
        <SectionHeader>Other (non-project) Tasks</SectionHeader>
        {renderSimpleSection('otherTasks', 'Non-project task')}
      </div>

      {/* Concerns */}
      <div className="group/section">
        <SectionHeader>Concerns</SectionHeader>
        {renderSimpleSection('concerns', 'Blocker or concern')}
      </div>

      {/* Plan for Next Day */}
      <div className="group/section">
        <SectionHeader>Plan for Next Day</SectionHeader>
        {renderSimpleSection('nextDayPlan', "Tomorrow's plan")}
      </div>

      {/* Upcoming Holidays */}
      <div className="group/section">
        <SectionHeader>Upcoming Holidays</SectionHeader>
        {renderSimpleSection('upcomingHolidays', 'Planned leave or holiday')}
      </div>

    </div>
  )
}
