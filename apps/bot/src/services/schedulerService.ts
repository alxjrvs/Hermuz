import type { Client } from 'discord.js'
import {
  createJob,
  getDueJobs,
  updateJob,
  type Job,
  type NewJob
} from '@hermuz/db'
import { logger } from '~/utils/logger'
import { getJobHandler } from './jobRegistry'

/** How often the loop wakes to run due jobs. */
const TICK_MS = Number(process.env.SCHEDULER_TICK_MS ?? 60_000)
/** Give up (mark FAILED) after this many attempts. */
const MAX_ATTEMPTS = 5
/** Backoff before a failed job is retried. */
const RETRY_DELAY_MS = 5 * 60_000

let timer: ReturnType<typeof setInterval> | null = null
let ticking = false

/**
 * Enqueue a durable scheduled action. `runAt` is ISO; the job fires on the first
 * tick at or after it. Handlers must be idempotent (re-derive state from the
 * domain tables) since a crash between "run" and "mark DONE" replays the job.
 */
export async function enqueueJob(
  kind: string,
  runAt: string,
  payload?: Record<string, unknown>
): Promise<Job | null> {
  const row: NewJob = {
    kind,
    runAt,
    payload: payload ? JSON.stringify(payload) : null
  }
  return createJob(row)
}

async function runOne(client: Client, job: Job): Promise<void> {
  const handler = getJobHandler(job.kind)
  if (!handler) {
    logger.warn(`No handler for job kind "${job.kind}" (job ${job.id})`)
    await updateJob(job.id, {
      status: 'FAILED',
      lastError: `no handler for kind ${job.kind}`
    })
    return
  }
  try {
    await handler(client, job)
    await updateJob(job.id, { status: 'DONE' })
  } catch (err) {
    const attempts = job.attempts + 1
    const failed = attempts >= MAX_ATTEMPTS
    await updateJob(job.id, {
      status: failed ? 'FAILED' : 'PENDING',
      attempts,
      lastError: String(err),
      runAt: failed
        ? job.runAt
        : new Date(Date.now() + RETRY_DELAY_MS).toISOString()
    })
    logger.error(
      `Job ${job.kind} ${job.id} failed (attempt ${attempts}/${MAX_ATTEMPTS}):`,
      err
    )
  }
}

async function tick(client: Client): Promise<void> {
  if (ticking) return // never overlap ticks (single writer)
  ticking = true
  try {
    const due = await getDueJobs(new Date().toISOString())
    for (const job of due) await runOne(client, job)
  } catch (err) {
    logger.error('Scheduler tick error:', err)
  } finally {
    ticking = false
  }
}

/** Start the background job loop. Idempotent. */
export function startScheduler(client: Client): void {
  if (timer) return
  logger.info(`Scheduler starting (tick every ${TICK_MS}ms)`)
  timer = setInterval(() => void tick(client), TICK_MS)
  // Kick shortly after boot so due work doesn't wait a full interval.
  setTimeout(() => void tick(client), 5_000)
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
