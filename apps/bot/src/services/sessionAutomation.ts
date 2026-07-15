import {
  getAllGameDays,
  getSessionOpenLeadDays,
  updateGameDay
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { logger } from '~/utils/logger'
import { announceGameDay } from './announceService'

/**
 * Open the campaign sessions that are coming up within the lead window. A
 * materialized session starts life as an inert CLOSED calendar row; when it
 * gets close enough we flip it to SCHEDULING and announce it (posting the RSVP
 * buttons), so a repeating campaign runs itself without manual generate+announce.
 *
 * Idempotent: a session is only opened once (guarded on status + whether it has
 * already been announced).
 */
export async function openDueSessions(client: Client): Promise<number> {
  const leadDays = await getSessionOpenLeadDays()
  const now = Date.now()
  const horizon = now + leadDays * 24 * 60 * 60_000

  const due = (await getAllGameDays()).filter((gd) => {
    if (!gd.campaignId) return false // only campaign sessions auto-open
    if (gd.status !== 'CLOSED') return false
    if (gd.announcementMessageId) return false
    const when = new Date(gd.dateTime).getTime()
    return when >= now && when <= horizon
  })

  let opened = 0
  for (const gd of due) {
    try {
      await updateGameDay(gd.id, { status: 'SCHEDULING' })
      const result = await announceGameDay(client, gd.id)
      if (result.ok) opened++
      else
        logger.warn(`Auto-open announce failed for ${gd.id}: ${result.error}`)
    } catch (err) {
      logger.error(`Error auto-opening session ${gd.id}:`, err)
    }
  }
  if (opened > 0) logger.info(`Auto-opened ${opened} upcoming session(s)`)
  return opened
}
