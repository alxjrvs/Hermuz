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

/**
 * Handle button interactions for game day attendance
 */
export default async (interaction: ButtonInteraction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  // Check if this is an attendance button
  if (!interaction.customId.startsWith('attendance_')) return

  try {
    // Extract the game day ID and status from the custom ID
    // Format: attendance_<status>_<gameDayId>
    const parts = interaction.customId.split('_')
    if (parts.length > 4 || parts.length < 3) return

    let status = parts[1] as AttendanceStatus
    let gameDayId = parts[2]

    if (parts.length === 4) {
      status = (parts[1] + '_' + parts[2]) as AttendanceStatus
      gameDayId = parts[3]
    }

    // Validate status
    if (!['AVAILABLE', 'INTERESTED', 'NOT_AVAILABLE'].includes(status)) {
      logger.error(`Invalid attendance status: ${status}`)
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

    // Get the previous attendance status if it exists
    const previousAttendance = await getUserAttendance(
      gameDayId,
      interaction.user.id
    )
    const previousStatus = previousAttendance?.status

    // Handle role assignment/removal based on status
    if (gameDay.discord_role_id) {
      try {
        const member = await interaction.guild?.members.fetch(
          interaction.user.id
        )
        if (member) {
          if (status === 'AVAILABLE') {
            // Add the role if the user is available
            await member.roles.add(
              gameDay.discord_role_id,
              'User marked as available for game day'
            )
            logger.info(
              `Added role ${gameDay.discord_role_id} to user ${interaction.user.id} for game day ${gameDayId}`
            )
          } else if (previousStatus === 'AVAILABLE') {
            // Remove the role if the user was previously available but is no longer
            await member.roles.remove(
              gameDay.discord_role_id,
              'User no longer available for game day'
            )
            logger.info(
              `Removed role ${gameDay.discord_role_id} from user ${interaction.user.id} for game day ${gameDayId}`
            )
          }
        }
      } catch (error) {
        logger.error(
          `Error managing role for user ${interaction.user.id}:`,
          error
        )
        // Continue with the attendance update even if role management fails
      }
    }

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

    // Get the updated attendance list
    const attendances = await getGameDayAttendances(gameDayId)

    // Get the game information if game_id exists
    let game = null
    if (gameDay.game_id) {
      game = await getGame(gameDay.game_id)
    }

    try {
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

    return interaction.editReply({
      content: `Attendance updated successfully! ${statusMessage}`
    })
  } catch (error) {
    logger.error('Error handling attendance button interaction:', error)

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content:
            'An error occurred while updating your attendance. Please try again later.'
        })
      } else {
        await interaction.reply({
          content:
            'An error occurred while updating your attendance. Please try again later.',
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (replyError) {
      logger.error('Error replying to interaction:', replyError)
    }
  }
}
