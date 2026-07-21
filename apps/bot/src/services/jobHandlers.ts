import {
  getAllCampaigns,
  getGameDaysByCampaign,
  getPendingJobsByKind,
  type Job
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { logger } from '~/utils/logger'
import { eightAmEtGameDay } from '~/utils/timezone'
import { announceGameDayReminder } from './announceService'
import { registerJobHandler } from './jobRegistry'
import { enqueueJob } from './schedulerService'
import { openDueSessions } from './sessionAutomation'
import { materializeSessions } from './sessionService'

/**
 * Central registration point for scheduled-job handlers. Imported for its side
 * effects by the bot entry (`~/services/jobHandlers`). Feature modules that own
 * a job kind register it here (or self-register on import) so the scheduler can
 * dispatch it.
 */

export const HORIZON_REFRESH = 'HORIZON_REFRESH'
/** Fires at 8am ET on game day to post a REPEATING session's day-of reminder. */
export const GAMEDAY_ANNOUNCE = 'GAMEDAY_ANNOUNCE'
/** How often the maintenance job re-runs itself. */
const REFRESH_INTERVAL_MS = 24 * 60 * 60_000

interface GameDayAnnouncePayload {
  gameDayId: string
}

function parseGameDayId(payload: string | null): string | null {
  if (!payload) return null
  try {
    const { gameDayId } = JSON.parse(payload) as GameDayAnnouncePayload
    return gameDayId ?? null
  } catch {
    return null
  }
}

/**
 * Ensure every upcoming, not-yet-announced REPEATING session has a pending
 * GAMEDAY_ANNOUNCE job set for 8am ET on its game day. Idempotent: skips
 * sessions that already have a pending job (deduped on the payload's gameDayId)
 * or an announcement. Campaigns with no channel wired are skipped (nowhere to
 * post) — surfaced in the log so the channel can be set.
 */
async function scheduleRepeatingAnnouncements(): Promise<number> {
  const repeating = (await getAllCampaigns()).filter(
    (c) => c.schedulingKind === 'REPEATING'
  )
  const pending = await getPendingJobsByKind(GAMEDAY_ANNOUNCE)
  const alreadyScheduled = new Set(
    pending.map((j) => parseGameDayId(j.payload)).filter(Boolean)
  )
  const now = Date.now()
  let scheduled = 0

  for (const campaign of repeating) {
    if (!campaign.discordChannelId) {
      logger.warn(
        `REPEATING campaign "${campaign.title}" (${campaign.id}) has no channel set — skipping day-of reminders.`
      )
      continue
    }
    const sessions = await getGameDaysByCampaign(campaign.id)
    for (const gd of sessions) {
      if (gd.status === 'CANCELLED') continue
      if (gd.announcementMessageId) continue
      if (new Date(gd.dateTime).getTime() < now) continue // session already past
      if (alreadyScheduled.has(gd.id)) continue
      const runAt = eightAmEtGameDay(new Date(gd.dateTime)).toISOString()
      await enqueueJob(GAMEDAY_ANNOUNCE, runAt, { gameDayId: gd.id })
      alreadyScheduled.add(gd.id)
      scheduled++
    }
  }
  return scheduled
}

/**
 * Post a REPEATING session's day-of reminder into its campaign channel. Fired at
 * 8am ET on game day. The handler re-derives everything from the game day, so a
 * cancelled session or a since-changed channel is handled safely.
 */
registerJobHandler(GAMEDAY_ANNOUNCE, async (client: Client, job: Job) => {
  const gameDayId = parseGameDayId(job.payload)
  if (!gameDayId) {
    logger.warn('GAMEDAY_ANNOUNCE job has no gameDayId payload; skipping.')
    return
  }
  const result = await announceGameDayReminder(client, gameDayId)
  if (!result.ok) {
    logger.warn(`GAMEDAY_ANNOUNCE for ${gameDayId} skipped: ${result.error}`)
  }
})

/**
 * Daily maintenance: keep every REPEATING campaign's session series
 * materialized, then re-enqueue itself. This is the scheduler's heartbeat — as
 * long as one HORIZON_REFRESH exists, the loop always has future work.
 */
registerJobHandler(HORIZON_REFRESH, async (client: Client, _job: Job) => {
  // The heartbeat must survive a failed run: catch here (so the scheduler
  // doesn't retry-and-duplicate the chain) and always re-enqueue in `finally`.
  // A transient failure just skips one day's maintenance, not the whole loop.
  try {
    const campaigns = await getAllCampaigns()
    let created = 0
    for (const c of campaigns) {
      if (c.schedulingKind !== 'REPEATING') continue
      const sessions = await materializeSessions(c.id)
      created += sessions.length
    }
    if (created > 0)
      logger.info(`HORIZON_REFRESH materialized ${created} session(s)`)
    // Open (announce) any SCHEDULED-campaign sessions within the lead window.
    await openDueSessions(client)
    // Ensure every REPEATING session has an 8am-ET day-of reminder scheduled.
    const reminders = await scheduleRepeatingAnnouncements()
    if (reminders > 0) logger.info(`Scheduled ${reminders} day-of reminder(s)`)
  } catch (err) {
    logger.error('HORIZON_REFRESH work failed; heartbeat continues:', err)
  } finally {
    await enqueueJob(
      HORIZON_REFRESH,
      new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString()
    )
  }
})

/**
 * Ensure the heartbeat job exists. Called once at boot: if no HORIZON_REFRESH is
 * pending (fresh DB, or the chain was interrupted), seed one to run now.
 */
export async function ensureHeartbeatJob(): Promise<void> {
  const pending = await getPendingJobsByKind(HORIZON_REFRESH)
  if (pending.length === 0) {
    await enqueueJob(HORIZON_REFRESH, new Date().toISOString())
    logger.info('Seeded HORIZON_REFRESH heartbeat job')
  }
}

// Feature job kinds self-register on import:
import './mealService' // registers MEAL_NUDGE
// import './sessionAutomation'  — SESSION_OPEN (Tier 2.3)
