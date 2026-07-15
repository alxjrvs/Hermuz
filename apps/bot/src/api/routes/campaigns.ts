import type { Client } from 'discord.js'
import { Hono } from 'hono'
import {
  getAllCampaigns,
  getCampaign,
  getPlayersByCampaign,
  updateCampaign,
  deleteCampaign,
  type NewCampaign
} from '@hermuz/db'
import { requireAdmin } from '~/api/middleware'
import {
  createCampaignWithDiscord,
  type CreateCampaignInput
} from '~/services/campaignService'
import { announceCampaign } from '~/services/announceService'
import { logger } from '~/utils/logger'
import { sendResult, resolveGuild, readJson } from './helpers'

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
    const body = await readJson<CreateCampaignInput>(c)
    if (!body?.title || !body?.regularGameTime) {
      return c.json({ error: 'title and regularGameTime are required' }, 400)
    }
    try {
      const guild = await resolveGuild(client)
      return sendResult(c, await createCampaignWithDiscord(guild, body))
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

  return app
}
