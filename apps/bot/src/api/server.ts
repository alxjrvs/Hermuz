import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { config } from '~/config'
import { logger } from '~/utils/logger'

/**
 * Start the JSON API in the same process as the bot, sharing the one SQLite
 * connection. Fleshed out in Phase 2 (games/game-days/campaigns CRUD + Discord
 * OAuth). The `client` is passed so API routes can check guild membership/roles.
 */
export function startApiServer(client: Client): void {
  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true, bot: client.isReady() }))

  Bun.serve({ port: config.port, fetch: app.fetch })
  logger.info(`API listening on :${config.port}`)
}
