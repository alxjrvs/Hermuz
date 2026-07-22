import type { Client } from 'discord.js'
import { Hono } from 'hono'
import { authMiddleware } from '~/api/middleware'
import { attendancesRoutes } from './attendances'
import { campaignsRoutes } from './campaigns'
import { gameDaysRoutes } from './gameDays'
import { gamesRoutes } from './games'
import { maintenanceRoutes } from './maintenance'
import { meRoutes } from './me'
import { playersRoutes } from './players'
import { settingsRoutes } from './settings'
import { surveysRoutes } from './surveys'
import { usersRoutes } from './users'

/**
 * Compose the `/api` app. Every route requires a valid Bearer JWT
 * (`authMiddleware`); individual write handlers are additionally gated on
 * Administrator via `requireAdmin` inside each resource router.
 */
export function createApiApp(client: Client): Hono {
  const app = new Hono()

  app.use('*', authMiddleware)

  app.route('/me', meRoutes(client))
  app.route('/users', usersRoutes(client))
  app.route('/games', gamesRoutes(client))
  app.route('/game-days', gameDaysRoutes(client))
  app.route('/campaigns', campaignsRoutes(client))
  app.route('/attendances', attendancesRoutes(client))
  app.route('/players', playersRoutes(client))
  app.route('/settings', settingsRoutes(client))
  app.route('/surveys', surveysRoutes(client))
  app.route('/maintenance', maintenanceRoutes(client))

  return app
}
