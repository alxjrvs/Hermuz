import {
  type Attendance,
  type AttendanceStatus,
  getGame,
  getGameDay,
  getGameDayAttendances,
  getOrCreateUser,
  updateUserAttendance
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { config } from '~/config'
import { createGameDayMessageEmbed } from '~/utils/gameDayMessageUtils'
import { logger } from '~/utils/logger'
import { handleGameDayRoleAssignment } from '~/utils/roleUtils'
import { getAnnouncementChannel } from '~/utils/schedulingChannel'
import { fail, ok, type ServiceResult } from './result'

/**
 * Set a user's RSVP for a game day, sync their game-day role, and re-render the
 * announcement embed. The single source of truth shared by the RSVP buttons,
 * the `/rsvp` command, and the web self-service endpoint — so all three behave
 * identically.
 */
export async function setUserAttendance(
  client: Client,
  gameDayId: string,
  userId: string,
  username: string,
  status: AttendanceStatus
): Promise<ServiceResult<Attendance>> {
  const gameDay = await getGameDay(gameDayId)
  if (!gameDay) return fail('Game day not found.', 404)

  await getOrCreateUser(userId, username)
  const attendance = await updateUserAttendance(gameDayId, userId, status)
  if (!attendance) return fail('Failed to update attendance.', 500)

  // Role sync + announcement refresh are best-effort — a Discord hiccup must not
  // fail the RSVP itself (the DB row is already updated).
  try {
    const guild = await client.guilds.fetch(config.guildId)
    const member = await guild.members.fetch(userId)
    if (member) await handleGameDayRoleAssignment(member, gameDay, status)
  } catch (err) {
    logger.error(`Role sync failed for RSVP (user ${userId}):`, err)
  }
  await refreshGameDayAnnouncement(client, gameDayId)

  return ok(attendance)
}

/** Re-render a game day's announcement embed in place, if it was announced. */
export async function refreshGameDayAnnouncement(
  client: Client,
  gameDayId: string
): Promise<void> {
  try {
    const gameDay = await getGameDay(gameDayId)
    if (!gameDay?.announcementMessageId) return
    const channel = await getAnnouncementChannel(client, gameDay)
    if (!channel) return
    const message = await channel.messages.fetch(gameDay.announcementMessageId)
    if (!message) return
    const attendances = await getGameDayAttendances(gameDayId)
    const game = gameDay.gameId ? await getGame(gameDay.gameId) : null
    await message.edit({
      embeds: [createGameDayMessageEmbed(gameDay, attendances, game)]
    })
  } catch (err) {
    logger.error('Error refreshing game day announcement:', err)
  }
}
