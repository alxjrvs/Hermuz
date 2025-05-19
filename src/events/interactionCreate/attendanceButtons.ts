import { logger } from 'robo.js'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getOrCreateUser } from '../../models/user'
import {
  updateUserAttendance,
  getGameDayAttendances,
  getUserAttendance
} from '../../models/attendance'
import { getGameDay } from '../../models/gameDay'
import { getGame } from '../../models/game'
import { AttendanceStatus } from '../../types/enums'
import { createGameDayMessageEmbed } from '../../utils/gameDayMessageUtils'
import {
  deserializeButtonData,
  isAttendanceButton,
  AttendanceButtonData
} from '../../utils/buttonUtils'
import { isAttendanceStatus, isDiscordId, isUUID } from '../../utils/typeGuards'

/**
 * Handle legacy attendance button format (attendance_<status>_<gameDayId>)
 */
async function handleLegacyAttendanceButton(interaction: ButtonInteraction) {
  try {
    // Extract the game day ID and status from the custom ID
    // Format: attendance_<status>_<gameDayId>
    const parts = interaction.customId.split('_')
    if (parts.length > 4 || parts.length < 3) return

    let statusValue = parts[1]
    let gameDayId = parts[2]

    if (parts.length === 4) {
      statusValue = parts[1] + '_' + parts[2]
      gameDayId = parts[3]
    }

    // Validate status using our type guard
    if (!isAttendanceStatus(statusValue)) {
      logger.error(`Invalid attendance status: ${statusValue}`)
      return
    }

    // Validate game day ID using our type guard
    if (!isUUID(gameDayId)) {
      logger.error(`Invalid game day ID: ${gameDayId}`)
      return
    }

    // Process the attendance update with the validated status
    await processAttendanceUpdate(interaction, statusValue, gameDayId)
  } catch (error) {
    logger.error('Error handling legacy attendance button:', error)
    handleInteractionError(interaction, error)
  }
}

/**
 * Process an attendance update
 */
async function processAttendanceUpdate(
  interaction: ButtonInteraction,
  status: AttendanceStatus,
  gameDayId: string
) {
  // Validate inputs using our type guards
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

  // Defer the reply to avoid interaction timeout
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  // Get the game day
  const gameDay = await getGameDay(gameDayId)
  if (!gameDay) {
    return interaction.editReply({
      content: 'Game day not found. It may have been deleted.'
    })
  }

  // Get or create the user
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username
  )
  if (!user) {
    return interaction.editReply({
      content:
        'Failed to retrieve or create user record. Please try again later.'
    })
  }

  // Update the user's attendance
  const attendance = await updateUserAttendance(
    gameDayId,
    interaction.user.id,
    status
  )

  if (!attendance) {
    return interaction.editReply({
      content: 'Failed to update attendance. Please try again later.'
    })
  }

  // Handle role assignment/removal based on status
  await handleRoleAssignment(interaction, gameDay, status, gameDayId)

  // Success message
  let statusMessage = ''
  switch (status) {
    case 'AVAILABLE':
      statusMessage = `You are marked as available for "${gameDay.title}". You have been assigned the game day role.`
      break
    case 'INTERESTED':
      statusMessage = `You are marked as interested in "${gameDay.title}".`
      break
    case 'NOT_AVAILABLE':
      statusMessage = `You are marked as not available for "${gameDay.title}".`
      break
  }

  // Update the game day message
  await updateGameDayMessage(interaction, gameDay, gameDayId)

  return interaction.editReply({
    content: `Attendance updated successfully! ${statusMessage}`
  })
}

/**
 * Handle role assignment/removal based on attendance status
 */
async function handleRoleAssignment(
  interaction: ButtonInteraction,
  gameDay: any,
  status: AttendanceStatus,
  gameDayId: string
) {
  if (gameDay.discord_role_id) {
    try {
      const member = await interaction.guild?.members.fetch(interaction.user.id)
      if (member) {
        if (status === 'AVAILABLE') {
          await member.roles.add(
            gameDay.discord_role_id,
            'User marked as available for game day'
          )
          logger.info(
            `Added role ${gameDay.discord_role_id} to user ${interaction.user.id} for game day ${gameDayId}`
          )
          return
        }
        await member.roles.remove(
          gameDay.discord_role_id,
          'User no longer available for game day'
        )
        logger.info(
          `Removed role ${gameDay.discord_role_id} from user ${interaction.user.id} for game day ${gameDayId}`
        )
      }
    } catch (error) {
      logger.error(
        `Error managing role for user ${interaction.user.id}:`,
        error
      )
      // Continue with the attendance update even if role management fails
    }
  }
}

/**
 * Update the game day message with new attendance information
 */
async function updateGameDayMessage(
  interaction: ButtonInteraction,
  gameDay: any,
  gameDayId: string
) {
  try {
    // Get the updated attendance list
    const attendances = await getGameDayAttendances(gameDayId)

    // Get the game information if game_id exists
    let game = null
    if (gameDay.game_id) {
      game = await getGame(gameDay.game_id)
    }

    // Get the original message
    const message = interaction.message

    // Create updated embed with new attendance counts using our utility function
    const updatedEmbed = createGameDayMessageEmbed(gameDay, attendances, game)

    // Update the original message with the new embed
    await message.edit({
      embeds: [updatedEmbed],
      components: message.components // Keep the same buttons
    })

    logger.info(
      `Updated game day message with new attendance for game day: ${gameDayId}`
    )
  } catch (error) {
    logger.error('Error updating game day message:', error)
    // Continue to reply to the user even if updating the message fails
  }
}

/**
 * Handle interaction errors
 */
async function handleInteractionError(
  interaction: ButtonInteraction,
  error: unknown
) {
  // Log the error with more context
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Error in attendance button interaction: ${errorMessage}`)

  try {
    // Prepare a user-friendly error message
    const userMessage =
      'An error occurred while updating your attendance. Please try again later.'

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

export default async (interaction: ButtonInteraction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  try {
    // Deserialize the button data
    const buttonData = deserializeButtonData(interaction.customId)

    // If deserialization failed or this is not an attendance button, ignore it
    if (!buttonData || !isAttendanceButton(buttonData)) {
      // For backward compatibility, check if this is an old-style attendance button
      if (interaction.customId.startsWith('attendance_')) {
        // Handle old-style button format
        return handleLegacyAttendanceButton(interaction)
      }
      return
    }

    // Extract data from the button
    const { status, gameDayId } = buttonData

    // Process the attendance update using our shared function
    await processAttendanceUpdate(interaction, status, gameDayId)
  } catch (error) {
    logger.error('Error handling attendance button interaction:', error)
    handleInteractionError(interaction, error)
  }
}
