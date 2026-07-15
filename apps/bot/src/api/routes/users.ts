import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { config } from '~/config'

/**
 * Resolve Discord identities so the web console can render names + avatars
 * instead of raw snowflake IDs. `GET /api/users?ids=a,b,c` returns one row per
 * id; unresolvable ids fall back to the id string with a null avatar.
 */
export function usersRoutes(client: Client): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    const ids = (c.req.query('ids') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100)
    if (ids.length === 0) return c.json([])

    const guild = await client.guilds.fetch(config.guildId)
    const rows = await Promise.all(
      ids.map(async (id) => {
        try {
          const member = await guild.members.fetch(id)
          return {
            id,
            username: member.user.username,
            displayName: member.displayName,
            avatarUrl: member.displayAvatarURL({ size: 64 })
          }
        } catch {
          return { id, username: id, displayName: id, avatarUrl: null }
        }
      })
    )
    return c.json(rows)
  })

  return app
}
