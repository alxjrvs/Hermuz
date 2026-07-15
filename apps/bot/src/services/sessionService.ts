import {
  getCampaign,
  getGameDaysByCampaign,
  createGameDay,
  type GameDay,
  type Campaign
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
 * Ensure a REPEATING campaign has its upcoming session series materialized as
 * `game_days` (calendar entries only — no Discord role/channel/event is created).
 * Idempotent: only fills in session numbers that don't already exist, up to the
 * campaign's `maxSessions` (or an 8-session horizon when uncapped). No-op for
 * SCHEDULED campaigns or when recurrence isn't configured.
 */
export async function materializeSessions(
  campaignId: string
): Promise<GameDay[]> {
  const campaign = await getCampaign(campaignId)
  if (!campaign || campaign.schedulingKind !== 'REPEATING') return []
  const base = recurrenceBase(campaign)
  if (!base) return []

  const interval = campaign.recurrenceIntervalWeeks ?? 1
  const target = campaign.maxSessions ?? DEFAULT_HORIZON
  const existing = await getGameDaysByCampaign(campaignId)
  const existingNumbers = new Set(
    existing.map((g) => g.sessionNumber).filter((n): n is number => n != null)
  )

  const created: GameDay[] = []
  for (let n = 1; n <= target; n++) {
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
