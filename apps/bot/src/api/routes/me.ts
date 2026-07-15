import type { Client } from 'discord.js'
import { Hono } from 'hono'

/** Current authenticated user (from the verified JWT). */
export function meRoutes(_client: Client): Hono {
  const app = new Hono()

  app.get('/', (c) => c.json(c.get('user')))

  return app
}
