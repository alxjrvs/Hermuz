import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { config } from '~/config'
import { logger } from '~/utils/logger'
import { createAuthApp } from '~/api/auth'
import { createApiApp } from '~/api/routes'

/**
 * Start the JSON API in the same process as the bot, sharing the one SQLite
 * connection and the discord.js `Client` (so routes can drive Discord
 * side-effects and resolve guild membership/roles).
 */
export function startApiServer(client: Client): void {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: config.webOrigin,
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
    })
  )

  app.get('/health', (c) => c.json({ ok: true, bot: client.isReady() }))

  app.route('/auth', createAuthApp(client))
  app.route('/api', createApiApp(client))

  Bun.serve({ port: config.port, fetch: app.fetch })
  logger.info(`API listening on :${config.port}`)
}
