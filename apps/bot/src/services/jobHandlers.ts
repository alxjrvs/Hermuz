import { getAllCampaigns, getPendingJobsByKind, type Job } from '@hermuz/db'
import type { Client } from 'discord.js'
import { logger } from '~/utils/logger'
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
/** How often the maintenance job re-runs itself. */
const REFRESH_INTERVAL_MS = 24 * 60 * 60_000

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
    // Open (announce) any sessions now within the lead window.
    await openDueSessions(client)
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
