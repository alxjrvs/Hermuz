import {
  deletePlayer,
  type NewPlayer,
  PLAYER_STATUS,
  type PlayerStatus,
  updatePlayer
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { requireAdmin } from '~/api/middleware'
import {
  joinCampaign,
  leaveCampaign,
  setCharacterName,
  setPlayerStatus
} from '~/services/playerService'
import { readJson } from './helpers'

const isPlayerStatus = (v: unknown): v is PlayerStatus =>
  typeof v === 'string' && (PLAYER_STATUS as readonly string[]).includes(v)

export function playersRoutes(client: Client): Hono {
  const app = new Hono()

  // --- Self-service (member-level): manage your OWN membership. Mirrors the
  // /campaign join|leave|confirm and /character set commands via one service. ---

  app.put('/campaign/:campaignId/me', async (c) => {
    const user = c.get('user')
    const result = await joinCampaign(
      client,
      c.req.param('campaignId'),
      user.id,
      user.username
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  app.delete('/campaign/:campaignId/me', async (c) => {
    const user = c.get('user')
    const result = await leaveCampaign(
      client,
      c.req.param('campaignId'),
      user.id
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  app.put('/campaign/:campaignId/me/status', async (c) => {
    const user = c.get('user')
    const body = await readJson<{ status?: unknown }>(c)
    if (!body || !isPlayerStatus(body.status)) {
      return c.json(
        { error: 'status must be one of ' + PLAYER_STATUS.join(', ') },
        400
      )
    }
    const result = await setPlayerStatus(
      client,
      c.req.param('campaignId'),
      user.id,
      body.status
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  app.put('/campaign/:campaignId/me/character', async (c) => {
    const user = c.get('user')
    const body = await readJson<{ characterName?: unknown }>(c)
    if (!body || typeof body.characterName !== 'string') {
      return c.json({ error: 'characterName is required' }, 400)
    }
    const result = await setCharacterName(
      client,
      c.req.param('campaignId'),
      user.id,
      body.characterName
    )
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as 400)
    }
    return c.json(result.data)
  })

  // --- Admin overrides ---

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
