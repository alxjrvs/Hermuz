import {
  type GameDay,
  getGame,
  getGameDay,
  getGameDayAttendances,
  getOrCreateUser,
  updateUserAttendance
} from '@hermuz/db'
import { type ButtonInteraction, MessageFlags } from 'discord.js'
import { logger } from '~/utils/logger'
import { getSchedulingChannel } from '~/utils/schedulingChannel'
import type { AttendanceStatus } from '../types/enums'
import type { ButtonHandler } from '../utils/buttonRegistry'
import { type ButtonData, isAttendanceButton } from '../utils/buttonUtils'
import { createGameDayMessageEmbed } from '../utils/gameDayMessageUtils'
import {
  generateAttendanceErrorMessage,
  generateAttendanceStatusMessage
} from '../utils/messageUtils'
import { handleGameDayRoleAssignment } from '../utils/roleUtils'
import { isAttendanceStatus, isDiscordId, isUUID } from '../utils/typeGuards'

async function processAttendanceUpdate(
  interaction: ButtonInteraction,
  status: AttendanceStatus,
  gameDayId: string
) {
  if (!isAttendanceStatus(status)) {
    logger.error(
      `Invalid attendance status in processAttendanceUpdate: ${status}`
    )
    return
  }

  if (!isUUID(gameDayId)) {
    logger.error(`Invalid game day ID in processAttendanceUpdate: ${gameDayId}`)
    return
  }

  if (!isDiscordId(interaction.user.id)) {
    logger.error(`Invalid Discord user ID: ${interaction.user.id}`)
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const gameDay = await getGameDay(gameDayId)
  if (!gameDay) {
    return interaction.editReply({
      content: generateAttendanceErrorMessage('not_found')
    })
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username
  )

  if (!user) {
    return interaction.editReply({
      content: generateAttendanceErrorMessage('user_error')
    })
  }

  const attendance = await updateUserAttendance(
    gameDayId,
    interaction.user.id,
    status
  )

  if (!attendance) {
    return interaction.editReply({
      content: generateAttendanceErrorMessage('attendance_error')
    })
  }

  await handleRoleAssignment(interaction, gameDay, status)

  const statusMessage = generateAttendanceStatusMessage(status, gameDay)

  await updateGameDayMessage(interaction, gameDay, gameDayId)

  return interaction.editReply({
    content: `Attendance updated successfully! ${statusMessage}`
  })
}

async function handleRoleAssignment(
  interaction: ButtonInteraction,
  gameDay: GameDay,
  status: AttendanceStatus
) {
  try {
    const member = await interaction.guild!.members.fetch(interaction.user.id)
    if (member) {
      await handleGameDayRoleAssignment(member, gameDay, status)
    }
  } catch (error) {
    logger.error(
      `Error fetching member for role assignment: ${interaction.user.id}`,
      error
    )
  }
}

async function updateGameDayMessage(
  interaction: ButtonInteraction,
  gameDay: GameDay,
  gameDayId: string
) {
  try {
    if (!gameDay.announcementMessageId) {
      return
    }

    // Get the scheduling channel from the guild
    const schedulingChannel = await getSchedulingChannel(interaction.client)
    if (!schedulingChannel) {
      return
    }

    const channel = await interaction.guild!.channels.fetch(
      schedulingChannel.id
    )

    if (!channel?.isTextBased()) {
      return
    }

    const message = await channel.messages.fetch(gameDay.announcementMessageId)
    if (!message) {
      return
    }

    const attendances = await getGameDayAttendances(gameDayId)
    const game = gameDay.gameId ? await getGame(gameDay.gameId) : null

    const embed = createGameDayMessageEmbed(gameDay, attendances, game)

    await message.edit({
      embeds: [embed]
    })
  } catch (error) {
    logger.error('Error updating game day message:', error)
  }
}

async function handleInteractionError(
  interaction: ButtonInteraction,
  error: unknown
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Error in attendance button interaction: ${errorMessage}`)

  try {
    const userMessage = generateAttendanceErrorMessage('generic')

    if (interaction.deferred) {
      await interaction.editReply({
        content: userMessage
      })
    } else {
      await interaction.reply({
        content: userMessage,
        flags: MessageFlags.Ephemeral
      })
    }
  } catch (replyError) {
    logger.error('Error replying to interaction:', replyError)
  }
}

export const attendanceButtonHandler: ButtonHandler = {
  canHandle: (data: ButtonData) => isAttendanceButton(data),
  handle: async (interaction: ButtonInteraction, data: ButtonData) => {
    try {
      if (isAttendanceButton(data)) {
        const { status, gameDayId } = data
        await processAttendanceUpdate(interaction, status, gameDayId)
      }
    } catch (error) {
      logger.error('Error handling attendance button interaction:', error)
      await handleInteractionError(interaction, error)
    }
  }
}
