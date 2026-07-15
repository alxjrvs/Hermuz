import { deletePlayer, type NewPlayer, updatePlayer } from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import { readJson } from './helpers'

export function playersRoutes(_client: Client): Hono {
  const app = new Hono()

  app.patch('/:id', requireAdmin, async (c) => {
    const body = await readJson<Partial<NewPlayer>>(c)
    if (!body) return c.json({ error: 'invalid body' }, 400)
    const updated = await updatePlayer(c.req.param('id'), body)
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', requireAdmin, async (c) => {
    const okDeleted = await deletePlayer(c.req.param('id'))
    if (!okDeleted) return c.json({ error: 'delete failed' }, 500)
    return c.json({ ok: true })
  })

  return app
}
