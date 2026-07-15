import { logger } from '~/utils/logger'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getGameDay } from '@hermuz/db'
import { AttendanceStatus } from '../types/enums'
import { ButtonData, isAttendanceButton } from '../utils/buttonUtils'
import { isAttendanceStatus, isDiscordId, isUUID } from '../utils/typeGuards'
import { ButtonHandler } from '../utils/buttonRegistry'
import {
  generateAttendanceStatusMessage,
  generateAttendanceErrorMessage
} from '../utils/messageUtils'
import { setUserAttendance } from '~/services/attendanceService'

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

  // The shared service does the DB write, role sync, and announcement refresh —
  // the exact same path as the `/rsvp` command and the web endpoint.
  const result = await setUserAttendance(
    interaction.client,
    gameDayId,
    interaction.user.id,
    interaction.user.username,
    status
  )
  if (!result.ok) {
    return interaction.editReply({
      content: generateAttendanceErrorMessage('attendance_error')
    })
  }

  const gameDay = await getGameDay(gameDayId)
  const statusMessage = gameDay
    ? generateAttendanceStatusMessage(status, gameDay)
    : ''
  return interaction.editReply({
    content: `Attendance updated successfully! ${statusMessage}`
  })
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
