import type { Client } from 'discord.js'
import { Hono } from 'hono'
import {
  getAllGameDays,
  getGameDay,
  getGameDayAttendances,
  updateGameDay,
  type NewGameDay
} from '@hermuz/db'
import { requireAdmin } from '~/api/middleware'
import {
  createGameDayWithDiscord,
  cancelGameDayWithDiscord,
  type CreateGameDayInput
} from '~/services/gameDayService'
import { announceGameDay } from '~/services/announceService'
import { logger } from '~/utils/logger'
import { sendResult, resolveGuild, readJson } from './helpers'

export function gameDaysRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => c.json(await getAllGameDays()))

  app.get('/:id', async (c) => {
    const gameDay = await getGameDay(c.req.param('id'))
    if (!gameDay) return c.json({ error: 'not found' }, 404)
    return c.json(gameDay)
  })

  app.get('/:id/attendances', async (c) => {
    const gameDay = await getGameDay(c.req.param('id'))
    if (!gameDay) return c.json({ error: 'not found' }, 404)
    return c.json(await getGameDayAttendances(gameDay.id))
  })

  app.post('/', requireAdmin, async (c) => {
    const body = await readJson<CreateGameDayInput>(c)
    if (!body?.title || !body?.dateTime || !body?.hostUserId) {
      return c.json(
        { error: 'title, dateTime and hostUserId are required' },
        400
      )
    }
    try {
      const guild = await resolveGuild(client)
      return sendResult(c, await createGameDayWithDiscord(guild, body))
    } catch (err) {
      logger.error('POST /game-days failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.patch('/:id', requireAdmin, async (c) => {
    const body = await readJson<Partial<NewGameDay>>(c)
    if (!body) return c.json({ error: 'invalid body' }, 400)
    const updated = await updateGameDay(c.req.param('id'), body)
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    return c.json(updated)
  })

  app.post('/:id/announce', requireAdmin, async (c) => {
    try {
      return sendResult(c, await announceGameDay(client, c.req.param('id')))
    } catch (err) {
      logger.error('POST /game-days/:id/announce failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.post('/:id/cancel', requireAdmin, async (c) => {
    try {
      const guild = await resolveGuild(client)
      return sendResult(
        c,
        await cancelGameDayWithDiscord(guild, c.req.param('id'))
      )
    } catch (err) {
      logger.error('POST /game-days/:id/cancel failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  return app
}
