import type { Client } from 'discord.js'
import { Hono } from 'hono'
import {
  getSchedulingChannelId,
  setSchedulingChannelId,
  getTimezone,
  setTimezone,
  getSessionOpenLeadDays,
  setSessionOpenLeadDays
} from '@hermuz/db'
import { requireAdmin } from '~/api/middleware'
import { readJson } from './helpers'

export function settingsRoutes(_client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    const [schedulingChannelId, timezone, sessionOpenLeadDays] =
      await Promise.all([
        getSchedulingChannelId(),
        getTimezone(),
        getSessionOpenLeadDays()
      ])
    return c.json({ schedulingChannelId, timezone, sessionOpenLeadDays })
  })

  app.put('/scheduling-channel', requireAdmin, async (c) => {
    const body = await readJson<{ channelId?: unknown }>(c)
    if (!body || typeof body.channelId !== 'string' || !body.channelId) {
      return c.json({ error: 'channelId (string) is required' }, 400)
    }
    const okSet = await setSchedulingChannelId(body.channelId)
    if (!okSet)
      return c.json({ error: 'failed to set scheduling channel' }, 500)
    return c.json({ schedulingChannelId: body.channelId })
  })

  app.put('/timezone', requireAdmin, async (c) => {
    const body = await readJson<{ timezone?: unknown }>(c)
    if (!body || typeof body.timezone !== 'string' || !body.timezone) {
      return c.json({ error: 'timezone (IANA string) is required' }, 400)
    }
    // Validate it's a real IANA zone.
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: body.timezone })
    } catch {
      return c.json({ error: 'invalid IANA timezone' }, 400)
    }
    const okSet = await setTimezone(body.timezone)
    if (!okSet) return c.json({ error: 'failed to set timezone' }, 500)
    return c.json({ timezone: body.timezone })
  })

  app.put('/session-lead', requireAdmin, async (c) => {
    const body = await readJson<{ days?: unknown }>(c)
    const days = Number(body?.days)
    if (!Number.isFinite(days) || days < 0) {
      return c.json({ error: 'days must be a non-negative number' }, 400)
    }
    const okSet = await setSessionOpenLeadDays(days)
    if (!okSet) return c.json({ error: 'failed to set lead days' }, 500)
    return c.json({ sessionOpenLeadDays: days })
  })

  return app
}
