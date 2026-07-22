import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import { runHorizonMaintenance } from '~/services/jobHandlers'
import { logger } from '~/utils/logger'

/**
 * Operator maintenance endpoints. `POST /refresh` runs the same pass as the
 * daily HORIZON_REFRESH on demand — materialize series, auto-open SCHEDULED
 * sessions, and (re)schedule REPEATING day-of reminders — so a channel/session
 * change takes effect immediately instead of waiting for the next daily tick.
 */
export function maintenanceRoutes(client: Client): Hono {
  const app = new Hono()

  app.post('/refresh', requireAdmin, async (c) => {
    try {
      await runHorizonMaintenance(client)
      return c.json({ ok: true })
    } catch (err) {
      logger.error('POST /maintenance/refresh failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  return app
}
