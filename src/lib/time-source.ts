/**
 * TimeSource — which time data source to use when evaluating a condition.
 *
 * Extensibility note:
 *   "local"   — locally recorded punch-in/out entries
 *   "portal"  — working hours from the HR portal
 *   future:   "custom" would be a user-defined daily override (highest priority
 *             when set, falls back to "local" otherwise). Slot it in here.
 */

export type TimeSource = "local" | "portal"

export interface TimeSourceDef {
  value: TimeSource
  label: string
  /** Short tooltip / description for settings UI */
  description: string
}

export const TIME_SOURCES: readonly TimeSourceDef[] = [
  {
    value: "local",
    label: "Local",
    description: "Use locally recorded punch-in/out times",
  },
  {
    value: "portal",
    label: "Portal",
    description: "Use working hours from the HR portal",
  },
]

/**
 * Resolve how many seconds to use for a given source.
 * Add new cases here when new sources are introduced.
 */
export function resolveSeconds(
  source: TimeSource,
  localSeconds: number,
  portalSeconds: number
): number {
  switch (source) {
    case "local":
      return localSeconds
    case "portal":
      return portalSeconds
  }
}
