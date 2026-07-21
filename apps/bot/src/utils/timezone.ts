/**
 * Minimal DST-aware timezone math over native `Date` (the repo pulls in no date
 * library). Mirrors the offset trick the operator CLI uses: format an instant in
 * the target zone, read it back as if it were UTC, and the difference is the
 * zone's offset at that moment.
 */

const ET = 'America/New_York'

/** The target zone's UTC offset (ms) at instant `at`, DST included. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const p = Object.fromEntries(
    dtf.formatToParts(at).map((part) => [part.type, part.value])
  )
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  )
  return asUTC - at.getTime()
}

/**
 * The UTC instant for `hour:minute` Eastern Time on the ET calendar date that
 * `ref` falls on. E.g. a session at `2026-07-28T00:30:00Z` (8:30pm ET Jul 27)
 * with hour 8 → `2026-07-27T12:00:00Z` (8:00am EDT Jul 27).
 */
export function etTimeOnDateOf(ref: Date, hour: number, minute = 0): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const p = Object.fromEntries(
    dtf.formatToParts(ref).map((part) => [part.type, part.value])
  )
  const guess = Date.UTC(+p.year, +p.month - 1, +p.day, hour, minute)
  // Single-pass is safe here: 8am is never near the 2am DST transition, so the
  // offset at `guess` equals the offset at the true instant.
  const off = tzOffsetMs(ET, new Date(guess))
  return new Date(guess - off)
}

/** 8:00am Eastern on the day a session takes place. */
export function eightAmEtGameDay(sessionUtc: Date): Date {
  return etTimeOnDateOf(sessionUtc, 8, 0)
}
