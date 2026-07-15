import { getGame, getGameByRoleId, getGameDayAttendances } from '@hermuz/db'
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { createGameDayWithDiscord } from '~/services/gameDayService'
import { logger } from '~/utils/logger'
import { createGameDayMessageEmbed } from '../utils/gameDayMessageUtils'
import { parseDateTime } from '../utils/gameDayUtils'
import type { GameDayScheduleModalData } from '../utils/modalUtils'

export async function handleGameDayScheduleModalSubmit(
  interaction: ModalSubmitInteraction,
  modalData: GameDayScheduleModalData
) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { userId, username, roleInfo } = modalData
    const title = interaction.fields.getTextInputValue('title')
    const description = interaction.fields.getTextInputValue('description')
    const dateTimeStr = interaction.fields.getTextInputValue('date_time')
    const location = interaction.fields.getTextInputValue('location')

    const dateTime = parseDateTime(dateTimeStr)
    if (!dateTime) {
      return interaction.editReply(
        'Invalid date/time format. Please use YYYY-MM-DD HH:MM format.'
      )
    }

    // Resolve the game from the chosen role, if any.
    let gameId: string | undefined
    if (roleInfo?.exists && roleInfo.id) {
      const game = await getGameByRoleId(roleInfo.id)
      if (game) gameId = game.id
    }

    // Delegate to the shared service — the same path the web/API uses. This is
    // what gives Discord-scheduled game days their location-type inheritance,
    // setup-task checklist, channels, event, and host attendance.
    const result = await createGameDayWithDiscord(interaction.guild!, {
      title,
      description,
      dateTime: dateTime.toISOString(),
      location,
      hostUserId: userId,
      hostUsername: username,
      gameId
    })
    if (!result.ok) return interaction.editReply(result.error)

    const gameDay = result.data
    const [attendances, game] = await Promise.all([
      getGameDayAttendances(gameDay.id),
      gameDay.gameId ? getGame(gameDay.gameId) : Promise.resolve(null)
    ])
    const embed = createGameDayMessageEmbed(gameDay, attendances, game)

    await interaction.editReply({
      content:
        'Game day created! Use `/game_day announce` and pick its role to post it in the scheduling channel.',
      embeds: [embed]
    })
    logger.info(`Game day scheduled: ${gameDay.id}`)
  } catch (error) {
    logger.error('Error handling game day schedule modal submission:', error)
    try {
      if (interaction.deferred) {
        await interaction.editReply(
          'An error occurred while processing your submission. Please try again later.'
        )
      } else {
        await interaction.reply({
          content:
            'An error occurred while processing your submission. Please try again later.',
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (replyError) {
      logger.error('Error replying to interaction:', replyError)
    }
  }
}
