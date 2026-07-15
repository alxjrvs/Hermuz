import type { Client } from 'discord.js'
import { Hono } from 'hono'
import {
  updateAttendance,
  updateUserAttendance,
  ATTENDANCE_STATUS,
  type AttendanceStatus
} from '@hermuz/db'
import { requireAdmin } from '~/api/middleware'
import { readJson } from './helpers'

const isStatus = (v: unknown): v is AttendanceStatus =>
  typeof v === 'string' && (ATTENDANCE_STATUS as readonly string[]).includes(v)

export function attendancesRoutes(_client: Client): Hono {
  const app = new Hono()

  // Admin override of a single attendance row's status.
  app.patch('/:id', requireAdmin, async (c) => {
    const body = await readJson<{ status?: unknown }>(c)
    if (!body || !isStatus(body.status)) {
      return c.json(
        { error: 'status must be one of ' + ATTENDANCE_STATUS.join(', ') },
        400
      )
    }
    const updated = await updateAttendance(c.req.param('id'), {
      status: body.status
    })
    if (!updated) return c.json({ error: 'not found or update failed' }, 404)
    return c.json(updated)
  })

  // Admin upsert of a user's attendance for a given game day.
  app.put('/game-day/:gameDayId/user/:userId', requireAdmin, async (c) => {
    const body = await readJson<{ status?: unknown }>(c)
    if (!body || !isStatus(body.status)) {
      return c.json(
        { error: 'status must be one of ' + ATTENDANCE_STATUS.join(', ') },
        400
      )
    }
    const updated = await updateUserAttendance(
      c.req.param('gameDayId'),
      c.req.param('userId'),
      body.status
    )
    if (!updated) return c.json({ error: 'update failed' }, 500)
    return c.json(updated)
  })

  return app
}
