import {
  deleteGame,
  getAllGames,
  getGame,
  type NewGame,
  updateGame
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import {
  type CreateGameInput,
  createGameWithRole
} from '~/services/gameService'
import { logger } from '~/utils/logger'
import { readJson, resolveGuild, sendResult } from './helpers'

export function gamesRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => c.json(await getAllGames()))

  app.get('/:id', async (c) => {
    const game = await getGame(c.req.param('id'))
    if (!game) return c.json({ error: 'not found' }, 404)
    return c.json(game)
  })

  app.post('/', requireAdmin, async (c) => {
    const body = await readJson<
      CreateGameInput &
        Partial<Pick<NewGame, 'defaultSchedulingKind' | 'maxSessions'>>
    >(c)
    if (!body?.name || !body?.shortName) {
      return c.json({ error: 'name and shortName are required' }, 400)
    }
    try {
      const guild = await resolveGuild(client)
      const result = await createGameWithRole(guild, body)
      if (!result.ok) return sendResult(c, result)

      // The create service doesn't set scheduling fields; apply them if given.
      const patch: Partial<NewGame> = {}
      if (body.defaultSchedulingKind !== undefined) {
        patch.defaultSchedulingKind = body.defaultSchedulingKind
      }
      if (body.maxSessions !== undefined) patch.maxSessions = body.maxSessions
      if (Object.keys(patch).length > 0) {
        const patched = await updateGame(result.data.id, patch)
        if (patched) return c.json(patched)
      }
      return c.json(result.data)
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
