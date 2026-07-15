import {
  cancelGameDay as cancelGameDayRepo,
  createAttendance,
  createGameDayDraft,
  type GameDay,
  getGame,
  getGameDay,
  getOrCreateUser,
  updateGameDay
} from '@hermuz/db'
import {
  type Guild,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} from 'discord.js'
import {
  createGameDayChannels,
  deleteGameDayChannels
} from '~/utils/channelUtils'
import { EventError, safelyDeleteEvent } from '~/utils/eventUtils'
import { createGameDayRole } from '~/utils/gameDayUtils'
import { logger } from '~/utils/logger'
import { fail, ok, type ServiceResult } from './result'
import { materializeTasksFromTemplates, renderChecklist } from './taskService'

export interface CreateGameDayInput {
  title: string
  description?: string | null
  /** ISO-8601 (or any Date-parseable) start time. Must be in the future. */
  dateTime: string
  location?: string | null
  hostUserId: string
  hostUsername?: string | null
  /** Optional associated game (id). */
  gameId?: string | null
  /** VIRTUAL/IN_PERSON; when omitted, inherits the game's default. */
  locationType?: 'VIRTUAL' | 'IN_PERSON' | null
}

/**
 * Create a game day with its Discord side-effects: role, draft row, private
 * channels, scheduled event, and the host's `AVAILABLE` attendance. Mirrors
 * `gameDayScheduleModalHandler` but returns a plain result instead of replying.
 */
export async function createGameDayWithDiscord(
  guild: Guild,
  input: CreateGameDayInput
): Promise<ServiceResult<GameDay>> {
  const dateTime = new Date(input.dateTime)
  if (Number.isNaN(dateTime.getTime())) {
    return fail('Invalid date/time. Provide an ISO-8601 timestamp.', 400)
  }
  if (dateTime <= new Date()) {
    return fail(
      'The game day must be scheduled for a future date and time.',
      400
    )
  }

  const user = await getOrCreateUser(
    input.hostUserId,
    input.hostUsername ?? input.hostUserId
  )
  if (!user) {
    return fail('Failed to retrieve or create the host user record.', 500)
  }

  let gameId: string | undefined
  let gameDefaultLocationType: 'VIRTUAL' | 'IN_PERSON' | null = null
  if (input.gameId) {
    const game = await getGame(input.gameId)
    if (game) {
      gameId = game.id
      gameDefaultLocationType = game.defaultLocationType
    }
  }

  const gameDayRole = await createGameDayRole(guild, input.title, dateTime)
  if (!gameDayRole) {
    return fail('Failed to create the game day role.', 500)
  }

  const gameDay = await createGameDayDraft({
    title: input.title,
    description: input.description ?? null,
    dateTime: dateTime.toISOString(),
    location: input.location ?? null,
    locationType: input.locationType ?? gameDefaultLocationType,
    hostUserId: input.hostUserId,
    gameId,
    discordRoleId: gameDayRole.id
  })
  if (!gameDay) {
    try {
      await gameDayRole.delete('Game day creation failed')
    } catch (err) {
      logger.error('Error deleting role after game day creation failed:', err)
    }
    return fail('Failed to create the game day.', 500)
  }

  const channels = await createGameDayChannels(guild, input.title, gameDayRole)
  if (!channels) {
    logger.error(`Failed to create channels for game day: ${gameDay.id}`)
  }

  try {
    const scheduledEvent = await guild.scheduledEvents.create({
      name: input.title,
      description: input.description || `Game day for ${input.title}`,
      scheduledStartTime: dateTime,
      scheduledEndTime: new Date(dateTime.getTime() + 4 * 60 * 60 * 1000),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: { location: input.location || 'TBD' }
    })
    await updateGameDay(gameDay.id, {
      discordEventId: scheduledEvent.id,
      discordCategoryId: channels?.category.id
    })
  } catch (err) {
    logger.error(
      `Error creating Discord scheduled event for ${gameDay.id}:`,
      err
    )
    if (channels?.category.id) {
      await updateGameDay(gameDay.id, {
        discordCategoryId: channels.category.id
      })
    }
  }

  // Seed the setup checklist from the game's task templates, then mirror it into
  // the logistics channel (best-effort — never blocks game-day creation).
  try {
    const seeded = await materializeTasksFromTemplates(gameDay.id)
    if (seeded.length > 0) await renderChecklist(guild.client, gameDay.id)
  } catch (err) {
    logger.error('Error seeding setup checklist:', err)
  }

  const hostAttendance = await createAttendance({
    gameDayId: gameDay.id,
    userId: input.hostUserId,
    status: 'AVAILABLE'
  })
  if (hostAttendance) {
    try {
      const member = await guild.members.fetch(input.hostUserId)
      await member.roles.add(
        gameDayRole.id,
        'Host automatically marked as available'
      )
    } catch (err) {
      logger.error('Error assigning role to host:', err)
    }
  }

  const latest = await getGameDay(gameDay.id)
  return ok(latest ?? gameDay)
}

/**
 * Cancel a game day: flip its status, delete its channels and scheduled event.
 * Mirrors the `/game_day cancel` command's Discord teardown.
 */
export async function cancelGameDayWithDiscord(
  guild: Guild,
  id: string
): Promise<ServiceResult<GameDay>> {
  const gameDay = await getGameDay(id)
  if (!gameDay) {
    return fail('Game day not found.', 404)
  }
  if (gameDay.status === 'CANCELLED') {
    return ok(gameDay)
  }

  const cancelled = await cancelGameDayRepo(id)
  if (!cancelled) {
    return fail('Failed to cancel the game day.', 500)
  }

  if (gameDay.discordCategoryId) {
    const deleted = await deleteGameDayChannels(
      guild,
      gameDay.discordCategoryId
    )
    if (!deleted) {
      logger.warn(
        `Failed to delete channels for cancelled game day: ${gameDay.id}`
      )
    }
  }

  if (gameDay.discordEventId) {
    try {
      await safelyDeleteEvent(guild, gameDay.discordEventId)
    } catch (err) {
      if (err instanceof EventError) {
        logger.error(
          `Event error cancelling game day ${gameDay.id}: ${err.message}`,
          err.originalError
        )
      } else {
        logger.error(
          `Failed to delete event for cancelled game day ${gameDay.id}:`,
          err
        )
      }
    }
  }

  return ok(cancelled)
}
