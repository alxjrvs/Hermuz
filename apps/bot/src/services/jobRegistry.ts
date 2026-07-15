import type { Client } from 'discord.js'
import type { Job } from '@hermuz/db'
import { logger } from '~/utils/logger'

/**
 * Job-kind → handler registry, mirroring the button registry pattern. Feature
 * modules register a handler for their `kind` at module load; the scheduler
 * (schedulerService) looks one up per due job. Keeps the loop decoupled from
 * the features it runs, and avoids circular imports.
 */
export type JobHandler = (client: Client, job: Job) => Promise<void>

const handlers = new Map<string, JobHandler>()

export function registerJobHandler(kind: string, handler: JobHandler): void {
  if (handlers.has(kind)) {
    logger.warn(`Job handler for "${kind}" is being overwritten`)
  }
  handlers.set(kind, handler)
}

export function getJobHandler(kind: string): JobHandler | undefined {
  return handlers.get(kind)
}
