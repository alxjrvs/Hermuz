import type { Client } from 'discord.js'
import { Hono } from 'hono'
import {
  getAllGames,
  getGame,
  updateGame,
  deleteGame,
  type NewGame
} from '@hermuz/db'
import { requireAdmin } from '~/api/middleware'
import {
  createGameWithRole,
  type CreateGameInput
} from '~/services/gameService'
import { logger } from '~/utils/logger'
import { sendResult, resolveGuild, readJson } from './helpers'

export function gamesRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => c.json(await getAllGames()))

  app.get('/:id', async (c) => {
    const game = await getGame(c.req.param('id'))
    if (!game) return c.json({ error: 'not found' }, 404)
    return c.json(game)
  })

  app.post('/', requireAdmin, async (c) => {
    const body = await readJson<CreateGameInput>(c)
    if (!body?.name || !body?.shortName) {
      return c.json({ error: 'name and shortName are required' }, 400)
    }
    try {
      const guild = await resolveGuild(client)
      return sendResult(c, await createGameWithRole(guild, body))
    } catch (err) {
      logger.error('POST /games failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.patch('/:id', requireAdmin, async (c) => {
    const body = await readJson<Partial<NewGame>>(c)
    if (!body) return c.json({ error: 'invalid body' }, 400)
    const updated = await updateGame(c.req.param('id'), body)
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', requireAdmin, async (c) => {
    const okDeleted = await deleteGame(c.req.param('id'))
    if (!okDeleted) return c.json({ error: 'delete failed' }, 500)
    return c.json({ ok: true })
  })

  return app
}
