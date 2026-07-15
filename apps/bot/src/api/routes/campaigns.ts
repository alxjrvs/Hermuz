import {
  cancelGameDay,
  deleteCampaign,
  getAllCampaigns,
  getCampaign,
  getGame,
  getGameDaysByCampaign,
  getPlayersByCampaign,
  type NewCampaign,
  updateCampaign
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import { announceCampaign } from '~/services/announceService'
import {
  type CreateCampaignInput,
  createCampaignWithDiscord
} from '~/services/campaignService'
import {
  materializeSessions,
  scheduleNextSession
} from '~/services/sessionService'
import { logger } from '~/utils/logger'
import { readJson, resolveGuild, sendResult } from './helpers'

export function campaignsRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => c.json(await getAllCampaigns()))

  app.get('/:id', async (c) => {
    const campaign = await getCampaign(c.req.param('id'))
    if (!campaign) return c.json({ error: 'not found' }, 404)
    return c.json(campaign)
  })

  app.get('/:id/players', async (c) => {
    const campaign = await getCampaign(c.req.param('id'))
    if (!campaign) return c.json({ error: 'not found' }, 404)
    return c.json(await getPlayersByCampaign(campaign.id))
  })

  app.post('/', requireAdmin, async (c) => {
    const body = await readJson<
      CreateCampaignInput &
        Partial<
          Pick<
            NewCampaign,
            | 'schedulingKind'
            | 'maxSessions'
            | 'recurrenceAnchor'
            | 'recurrenceWeekday'
            | 'recurrenceTime'
            | 'recurrenceIntervalWeeks'
            | 'locationType'
          >
        >
    >(c)
    if (!body?.title || !body?.regularGameTime) {
      return c.json({ error: 'title and regularGameTime are required' }, 400)
    }
    try {
      const guild = await resolveGuild(client)
      const result = await createCampaignWithDiscord(guild, body)
      if (!result.ok) return sendResult(c, result)

      // Scheduling defaults to the game's when omitted; the create service
      // doesn't set these, so apply them as a follow-up update.
      let schedulingKind = body.schedulingKind
      let maxSessions = body.maxSessions
      let locationType = body.locationType
      if (
        (schedulingKind === undefined ||
          maxSessions === undefined ||
          locationType === undefined) &&
        body.gameId
      ) {
        const game = await getGame(body.gameId)
        if (game) {
          if (schedulingKind === undefined) {
            schedulingKind = game.defaultSchedulingKind
          }
          if (maxSessions === undefined) maxSessions = game.maxSessions
          if (locationType === undefined) {
            locationType = game.defaultLocationType
          }
        }
      }

      const patch: Partial<NewCampaign> = {}
      if (schedulingKind !== undefined) patch.schedulingKind = schedulingKind
      if (maxSessions !== undefined) patch.maxSessions = maxSessions
      if (locationType !== undefined) patch.locationType = locationType
      if (body.recurrenceAnchor !== undefined) {
        patch.recurrenceAnchor = body.recurrenceAnchor
      }
      if (body.recurrenceWeekday !== undefined) {
        patch.recurrenceWeekday = body.recurrenceWeekday
      }
      if (body.recurrenceTime !== undefined) {
        patch.recurrenceTime = body.recurrenceTime
      }
      if (body.recurrenceIntervalWeeks !== undefined) {
        patch.recurrenceIntervalWeeks = body.recurrenceIntervalWeeks
      }

      let campaign = result.data
      if (Object.keys(patch).length > 0) {
        const updated = await updateCampaign(campaign.id, patch)
        if (updated) campaign = updated
      }

      // materializeSessions self-guards (no-op unless recurrence is configured).
      if (campaign.schedulingKind === 'REPEATING') {
        await materializeSessions(campaign.id)
      }

      return c.json(campaign)
    } catch (err) {
      logger.error('POST /campaigns failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.patch('/:id', requireAdmin, async (c) => {
    const body = await readJson<Partial<NewCampaign>>(c)
    if (!body) return c.json({ error: 'invalid body' }, 400)
    const updated = await updateCampaign(c.req.param('id'), body)
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    if (updated.schedulingKind === 'REPEATING') {
      await materializeSessions(updated.id)
    }
    return c.json(updated)
  })

  app.delete('/:id', requireAdmin, async (c) => {
    const okDeleted = await deleteCampaign(c.req.param('id'))
    if (!okDeleted) return c.json({ error: 'delete failed' }, 500)
    return c.json({ ok: true })
  })

  app.post('/:id/announce', requireAdmin, async (c) => {
    try {
      return sendResult(c, await announceCampaign(client, c.req.param('id')))
    } catch (err) {
      logger.error('POST /campaigns/:id/announce failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.get('/:id/sessions', async (c) => {
    const campaign = await getCampaign(c.req.param('id'))
    if (!campaign) return c.json({ error: 'not found' }, 404)
    return c.json(await getGameDaysByCampaign(campaign.id))
  })

  app.post('/:id/generate', requireAdmin, async (c) => {
    try {
      const campaign = await getCampaign(c.req.param('id'))
      if (!campaign) return c.json({ error: 'not found' }, 404)
      await materializeSessions(campaign.id)
      return c.json(await getGameDaysByCampaign(campaign.id))
    } catch (err) {
      logger.error('POST /campaigns/:id/generate failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.post('/:id/schedule-next', requireAdmin, async (c) => {
    const body = await readJson<{ dateTime?: string }>(c)
    try {
      const session = await scheduleNextSession(
        c.req.param('id'),
        body?.dateTime
      )
      if (!session) return c.json({ error: 'session cap reached' }, 409)
      return c.json(session)
    } catch (err) {
      logger.error('POST /campaigns/:id/schedule-next failed:', err)
      return c.json({ error: 'internal error' }, 500)
    }
  })

  app.post('/:id/sessions/:gameDayId/cancel', requireAdmin, async (c) => {
    try {
      const gameDay = await cancelGameDay(c.req.param('gameDayId'))
      if (!gameDay) return c.json({ error: 'not found' }, 404)
      return c.json(gameDay)
    } catch (err) {
      logger.error(
        'POST /campaigns/:id/sessions/:gameDayId/cancel failed:',
        err
      )
      return c.json({ error: 'internal error' }, 500)
    }
  })

  return app
}
