import {
  type Campaign,
  createGameDay,
  type GameDay,
  getCampaign,
  getGameDaysByCampaign
} from '@hermuz/db'

/** Sessions to keep materialized for a repeating campaign with no explicit cap. */
const DEFAULT_HORIZON = 8

/**
 * First session date/time: the next occurrence of `weekday`@`time` on or after
 * `after`. Computed in UTC so it's deterministic across environments (Render is
 * UTC); `recurrenceTime` is therefore a UTC wall-clock time.
 */
function firstSessionDate(
  weekday: number,
  timeHHMM: string,
  after: Date
): Date {
  const [h, m] = timeHHMM.split(':').map((n) => parseInt(n, 10))
  const d = new Date(after)
  d.setUTCHours(h || 0, m || 0, 0, 0)
  let delta = (weekday - d.getUTCDay() + 7) % 7
  if (delta === 0 && d.getTime() <= after.getTime()) delta = 7
  d.setUTCDate(d.getUTCDate() + delta)
  return d
}

function sessionDate(
  base: Date,
  sessionNumber: number,
  intervalWeeks: number
): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + (sessionNumber - 1) * intervalWeeks * 7)
  return d
}

/**
 * The 1-based number of the first session at or after `now`, for a series based
 * at `base` with `intervalWeeks` spacing. Lets materialization keep a rolling
 * window of *upcoming* sessions even when the anchor is in the past.
 */
function firstUpcomingSessionNumber(
  base: Date,
  intervalWeeks: number,
  now: Date
): number {
  const periodMs = intervalWeeks * 7 * 24 * 60 * 60 * 1000
  const diffMs = now.getTime() - base.getTime()
  let n = diffMs <= 0 ? 1 : Math.ceil(diffMs / periodMs) + 1
  while (
    n > 1 &&
    sessionDate(base, n - 1, intervalWeeks).getTime() >= now.getTime()
  )
    n--
  while (sessionDate(base, n, intervalWeeks).getTime() < now.getTime()) n++
  return n
}

/**
 * The series base date (first session). Prefers the explicit `recurrenceAnchor`
 * (the source of truth — may be in the past), falling back to the legacy
 * weekday/time anchored at the campaign's creation. Returns null if unconfigured.
 */
function recurrenceBase(campaign: Campaign): Date | null {
  if (campaign.recurrenceAnchor) {
    const d = new Date(campaign.recurrenceAnchor)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (campaign.recurrenceWeekday != null && campaign.recurrenceTime) {
    return firstSessionDate(
      campaign.recurrenceWeekday,
      campaign.recurrenceTime,
      new Date(campaign.createdAt ?? new Date().toISOString())
    )
  }
  return null
}

/**
 * Ensure a REPEATING campaign keeps a rolling window of its *upcoming* sessions
 * materialized as `game_days` (calendar entries only — no Discord
 * role/channel/event is created). Idempotent: fills in only the missing session
 * numbers in the window `[firstUpcoming, firstUpcoming + horizon)`, capped by
 * `maxSessions`. Because the window advances with time, an uncapped series keeps
 * generating sessions instead of stopping after the first `DEFAULT_HORIZON`.
 * No-op for SCHEDULED campaigns or when recurrence isn't configured.
 */
export async function materializeSessions(
  campaignId: string
): Promise<GameDay[]> {
  const campaign = await getCampaign(campaignId)
  if (campaign?.schedulingKind !== 'REPEATING') return []
  const base = recurrenceBase(campaign)
  if (!base) return []

  const interval = campaign.recurrenceIntervalWeeks ?? 1
  // Rolling window: DEFAULT_HORIZON sessions starting from the first one at or
  // after now (the anchor may be in the past), capped by maxSessions.
  const first = firstUpcomingSessionNumber(base, interval, new Date())
  const upper =
    campaign.maxSessions != null
      ? Math.min(first + DEFAULT_HORIZON - 1, campaign.maxSessions)
      : first + DEFAULT_HORIZON - 1
  const existing = await getGameDaysByCampaign(campaignId)
  const existingNumbers = new Set(
    existing.map((g) => g.sessionNumber).filter((n): n is number => n != null)
  )

  const created: GameDay[] = []
  for (let n = first; n <= upper; n++) {
    if (existingNumbers.has(n)) continue
    const gd = await createGameDay({
      title: `${campaign.title} — Session ${n}`,
      dateTime: sessionDate(base, n, interval).toISOString(),
      status: 'CLOSED',
      gameId: campaign.gameId,
      campaignId: campaign.id,
      sessionNumber: n,
      locationType: campaign.locationType,
      discordRoleId: campaign.discordRoleId
    })
    if (gd) created.push(gd)
  }
  return created
}

/**
 * Append the next session to a campaign (the "followup session" flow). Enforces
 * `maxSessions`. `dateTime` is used if given; otherwise it's derived from the
 * recurrence for REPEATING campaigns, or defaults to a week out.
 */
export async function scheduleNextSession(
  campaignId: string,
  dateTime?: string
): Promise<GameDay | null> {
  const campaign = await getCampaign(campaignId)
  if (!campaign) return null

  const existing = await getGameDaysByCampaign(campaignId)
  const maxNum = existing.reduce((m, g) => Math.max(m, g.sessionNumber ?? 0), 0)
  const nextNum = maxNum + 1
  if (campaign.maxSessions != null && nextNum > campaign.maxSessions)
    return null

  let when = dateTime
  if (!when) {
    const base =
      campaign.schedulingKind === 'REPEATING' ? recurrenceBase(campaign) : null
    if (base) {
      when = sessionDate(
        base,
        nextNum,
        campaign.recurrenceIntervalWeeks ?? 1
      ).toISOString()
    } else {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + 7)
      when = d.toISOString()
    }
  }

  return createGameDay({
    title: `${campaign.title} — Session ${nextNum}`,
    dateTime: when,
    status: 'CLOSED',
    gameId: campaign.gameId,
    campaignId: campaign.id,
    sessionNumber: nextNum,
    locationType: campaign.locationType,
    discordRoleId: campaign.discordRoleId
  })
}
