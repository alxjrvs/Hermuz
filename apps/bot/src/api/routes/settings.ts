import { getSchedulingChannelId, setSchedulingChannelId } from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import { readJson } from './helpers'

export function settingsRoutes(_client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    const schedulingChannelId = await getSchedulingChannelId()
    return c.json({ schedulingChannelId })
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

  return app
}
