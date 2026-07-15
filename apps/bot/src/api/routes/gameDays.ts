import {
  createGameDayTask,
  deleteGameDayTask,
  getAllGameDays,
  getGameDay,
  getGameDayAttendances,
  getGameDayTasks,
  getMealResponses,
  getMealsByGameDay,
  MEAL_KIND,
  type MealKind,
  type NewGameDay,
  type NewGameDayTask,
  replaceTaskTemplatesForGame,
  updateGameDay,
  updateGameDayTask
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import { announceGameDay } from '~/services/announceService'
import {
  type CreateGameDayInput,
  cancelGameDayWithDiscord,
  createGameDayWithDiscord
} from '~/services/gameDayService'
import {
  closeMeal,
  createMealSlot,
  respondToMeal
} from '~/services/mealService'
import { renderChecklist } from '~/services/taskService'
import { logger } from '~/utils/logger'
import { readJson, resolveGuild, sendResult } from './helpers'

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

  // --- Setup checklist (game_day_tasks) ---

  app.get('/:id/tasks', async (c) =>
    c.json(await getGameDayTasks(c.req.param('id')))
  )

  // Admins add checklist items.
  app.post('/:id/tasks', requireAdmin, async (c) => {
    const body = await readJson<{ label?: unknown; description?: unknown }>(c)
    if (!body || typeof body.label !== 'string' || !body.label.trim()) {
      return c.json({ error: 'label is required' }, 400)
    }
    const existing = await getGameDayTasks(c.req.param('id'))
    const created = await createGameDayTask({
      gameDayId: c.req.param('id'),
      label: body.label.trim(),
      description:
        typeof body.description === 'string' ? body.description : null,
      sortOrder: existing.length
    })
    if (!created) return c.json({ error: 'create failed' }, 500)
    await renderChecklist(client, c.req.param('id'))
    return c.json(created)
  })

  // Any member may check off a task or claim it (assign to self). Editing the
  // label/description or reassigning to someone else requires admin.
  app.patch('/:id/tasks/:taskId', async (c) => {
    const user = c.get('user')
    const body = await readJson<Partial<NewGameDayTask> & { done?: boolean }>(c)
    if (!body) return c.json({ error: 'invalid body' }, 400)

    const patch: Partial<NewGameDayTask> = {}
    if (typeof body.done === 'boolean') {
      patch.done = body.done ? 1 : 0
      patch.doneAt = body.done ? new Date().toISOString() : null
    }
    if (body.assigneeUserId !== undefined) {
      // Members may only assign to (or clear) themselves; admins to anyone.
      if (
        !user.isAdmin &&
        body.assigneeUserId !== user.id &&
        body.assigneeUserId !== null
      ) {
        return c.json({ error: 'forbidden: can only claim for yourself' }, 403)
      }
      patch.assigneeUserId = body.assigneeUserId
    }
    if (body.label !== undefined || body.description !== undefined) {
      if (!user.isAdmin) return c.json({ error: 'forbidden: admin only' }, 403)
      if (body.label !== undefined) patch.label = body.label
      if (body.description !== undefined) patch.description = body.description
    }

    const updated = await updateGameDayTask(c.req.param('taskId'), patch)
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    await renderChecklist(client, c.req.param('id'))
    return c.json(updated)
  })

  app.delete('/:id/tasks/:taskId', requireAdmin, async (c) => {
    const ok = await deleteGameDayTask(c.req.param('taskId'))
    if (!ok) return c.json({ error: 'delete failed' }, 500)
    await renderChecklist(client, c.req.param('id'))
    return c.json({ ok: true })
  })

  // Save this game day's current checklist as the game's default template set.
  app.post('/:id/tasks/save-as-default', requireAdmin, async (c) => {
    const gameDay = await getGameDay(c.req.param('id'))
    if (!gameDay?.gameId) {
      return c.json({ error: 'game day has no associated game' }, 400)
    }
    const tasks = await getGameDayTasks(gameDay.id)
    const saved = await replaceTaskTemplatesForGame(
      gameDay.gameId,
      tasks.map((t) => ({ label: t.label, description: t.description }))
    )
    return c.json(saved)
  })

  // --- Meal coordination (meals + meal_responses) ---

  const isMealKind = (v: unknown): v is MealKind =>
    typeof v === 'string' && (MEAL_KIND as readonly string[]).includes(v)

  app.get('/:id/meals', async (c) => {
    const meals = await getMealsByGameDay(c.req.param('id'))
    // Attach responses so the web can show who's in/out in one call.
    const withResponses = await Promise.all(
      meals.map(async (m) => ({
        ...m,
        responses: await getMealResponses(m.id)
      }))
    )
    return c.json(withResponses)
  })

  // Admin opens a meal slot (posts the poll to the food channel).
  app.post('/:id/meals', requireAdmin, async (c) => {
    const body = await readJson<{
      kind?: unknown
      plan?: unknown
      dueAt?: unknown
    }>(c)
    if (!body || !isMealKind(body.kind)) {
      return c.json({ error: 'kind must be LUNCH or DINNER' }, 400)
    }
    const result = await createMealSlot(
      client,
      c.req.param('id'),
      body.kind,
      typeof body.plan === 'string' ? body.plan : null,
      typeof body.dueAt === 'string' ? body.dueAt : null
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  // Self-service: the member records their own meal response.
  app.put('/:id/meals/:mealId/me', async (c) => {
    const user = c.get('user')
    const body = await readJson<{ attending?: unknown; note?: unknown }>(c)
    if (!body || typeof body.attending !== 'boolean') {
      return c.json({ error: 'attending (boolean) is required' }, 400)
    }
    const result = await respondToMeal(
      client,
      c.req.param('mealId'),
      user.id,
      user.username,
      body.attending,
      typeof body.note === 'string' ? body.note : null
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  app.post('/:id/meals/:mealId/close', requireAdmin, async (c) => {
    const result = await closeMeal(client, c.req.param('mealId'))
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  return app
}
