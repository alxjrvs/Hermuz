import {
  getAllSurveys,
  getGame,
  getSurvey,
  getSurveyDates,
  getSurveyResponses,
  type Survey
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import {
  cancelSurvey,
  canonizeSurvey,
  createSurvey,
  respondToSurvey
} from '~/services/surveyService'
import { readJson, resolveGuild, sendResult } from './helpers'

/** Attach a survey's game name, candidate dates, and responses for the web. */
async function hydrate(survey: Survey) {
  const [game, dates, responses] = await Promise.all([
    getGame(survey.gameId),
    getSurveyDates(survey.id),
    getSurveyResponses(survey.id)
  ])
  return { ...survey, gameName: game?.name ?? null, dates, responses }
}

export function surveysRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    const surveys = await getAllSurveys()
    return c.json(await Promise.all(surveys.map(hydrate)))
  })

  app.get('/:id', async (c) => {
    const survey = await getSurvey(c.req.param('id'))
    if (!survey) return c.json({ error: 'Survey not found' }, 404)
    return c.json(await hydrate(survey))
  })

  // Admin creates a survey and announces it.
  app.post('/', requireAdmin, async (c) => {
    const user = c.get('user')
    const body = await readJson<{
      gameId?: unknown
      title?: unknown
      description?: unknown
      dateTimes?: unknown
    }>(c)
    if (!body || typeof body.gameId !== 'string') {
      return c.json({ error: 'gameId is required' }, 400)
    }
    if (
      !Array.isArray(body.dateTimes) ||
      !body.dateTimes.every((d) => typeof d === 'string')
    ) {
      return c.json({ error: 'dateTimes must be an array of strings' }, 400)
    }
    const result = await createSurvey(client, {
      gameId: body.gameId,
      title: typeof body.title === 'string' ? body.title : null,
      description:
        typeof body.description === 'string' ? body.description : null,
      dateTimes: body.dateTimes as string[],
      createdByUserId: user.id,
      createdByUsername: user.username
    })
    return sendResult(c, result)
  })

  // Self-service: the member sets the full set of dates they're available for.
  app.put('/:id/me', async (c) => {
    const user = c.get('user')
    const body = await readJson<{ availableDateIds?: unknown }>(c)
    if (
      !body ||
      !Array.isArray(body.availableDateIds) ||
      !body.availableDateIds.every((d) => typeof d === 'string')
    ) {
      return c.json(
        { error: 'availableDateIds must be an array of strings' },
        400
      )
    }
    const result = await respondToSurvey(
      client,
      c.req.param('id'),
      user.id,
      user.username,
      body.availableDateIds as string[]
    )
    return sendResult(c, result)
  })

  // Admin canonizes one date into a real game day.
  app.post('/:id/canonize', requireAdmin, async (c) => {
    const user = c.get('user')
    const body = await readJson<{ surveyDateId?: unknown }>(c)
    if (!body || typeof body.surveyDateId !== 'string') {
      return c.json({ error: 'surveyDateId is required' }, 400)
    }
    const guild = await resolveGuild(client)
    const result = await canonizeSurvey(
      client,
      guild,
      c.req.param('id'),
      body.surveyDateId,
      user.id,
      user.username
    )
    return sendResult(c, result)
  })

  app.post('/:id/cancel', requireAdmin, async (c) => {
    const result = await cancelSurvey(client, c.req.param('id'))
    return sendResult(c, result)
  })

  return app
}
