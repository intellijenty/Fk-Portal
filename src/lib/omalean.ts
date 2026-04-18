/**
 * Formats total minutes into OmaLean booking format.
 *
 * The hour part is kept as-is; the minute part is expressed as a decimal
 * fraction of an hour, floored to the nearest 0.05
 * (e.g. 30 min → 0.5, 45 min → 0.75, 20 min → 0.30, 40 min → 0.65).
 *
 * @param totalMinutes  Total minutes worked
 * @returns Formatted string such as "7.5", "8.3", "8"
 */
export function formatOmaLean(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  // Floor fraction to nearest 0.05: multiply by 20, floor, divide back
  const fraction = Math.floor((minutes / 60) * 20) / 20
  // Round to 2 decimal places, then strip trailing zeros
  return parseFloat((hours + fraction).toFixed(2)).toString()
}
