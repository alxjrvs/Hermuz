import { logger } from 'robo.js'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getOrCreateUser } from '../../models/user'
import {
  updateUserAttendance,
  getGameDayAttendances
} from '../../models/attendance'
import { getGameDay } from '../../models/gameDay'
import { getGame } from '../../models/game'
import { AttendanceStatus } from '../../types/enums'
import { createGameDayMessageEmbed } from '../../utils/gameDayMessageUtils'
import { GameDay } from '../../utils/supabase'
import {
  deserializeButtonData,
  isAttendanceButton
} from '../../utils/buttonUtils'
import { isAttendanceStatus, isDiscordId, isUUID } from '../../utils/typeGuards'
async function handleLegacyAttendanceButton(interaction: ButtonInteraction) {
  try {
    const parts = interaction.customId.split('_')
    if (parts.length > 4 || parts.length < 3) return
    let statusValue = parts[1]
    let gameDayId = parts[2]
    if (parts.length === 4) {
      statusValue = parts[1] + '_' + parts[2]
      gameDayId = parts[3]
    }
    if (!isAttendanceStatus(statusValue)) {
      logger.error(`Invalid attendance status: ${statusValue}`)
      return
    }
    if (!isUUID(gameDayId)) {
      logger.error(`Invalid game day ID: ${gameDayId}`)
      return
    }
    await processAttendanceUpdate(interaction, statusValue, gameDayId)
  } catch (error) {
    logger.error('Error handling legacy attendance button:', error)
    handleInteractionError(interaction, error)
  }
}
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
      content: 'Game day not found. It may have been deleted.'
    })
  }
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
  await handleRoleAssignment(interaction, gameDay, status, gameDayId)
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
  await updateGameDayMessage(interaction, gameDay, gameDayId)
  return interaction.editReply({
    content: `Attendance updated successfully! ${statusMessage}`
  })
}
async function handleRoleAssignment(
  interaction: ButtonInteraction,
  gameDay: GameDay,
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
    }
  }
}
async function updateGameDayMessage(
  interaction: ButtonInteraction,
  gameDay: GameDay,
  gameDayId: string
) {
  try {
    const attendances = await getGameDayAttendances(gameDayId)
    let game = null
    if (gameDay.game_id) {
      game = await getGame(gameDay.game_id)
    }
    const message = interaction.message
    const updatedEmbed = createGameDayMessageEmbed(gameDay, attendances, game)
    await message.edit({
      embeds: [updatedEmbed],
      components: message.components 
    })
    logger.info(
      `Updated game day message with new attendance for game day: ${gameDayId}`
    )
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
  if (!interaction.isButton()) return
  try {
    const buttonData = deserializeButtonData(interaction.customId)
    if (!buttonData || !isAttendanceButton(buttonData)) {
      if (interaction.customId.startsWith('attendance_')) {
        return handleLegacyAttendanceButton(interaction)
      }
      return
    }
    const { status, gameDayId } = buttonData
    await processAttendanceUpdate(interaction, status, gameDayId)
  } catch (error) {
    logger.error('Error handling attendance button interaction:', error)
    handleInteractionError(interaction, error)
  }
}
