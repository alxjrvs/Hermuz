import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  Colors,
  EmbedBuilder
} from 'discord.js'
import { getGameDayByRoleId, updateGameDay } from '../../models/gameDay'
import { getSchedulingChannel } from '../../models/discordServer'
import { deleteGameDayChannels } from '../../utils/channelUtils'
import {
  safelyDeleteEvent,
  EventError,
  getUserFriendlyEventErrorMessage
} from '../../utils/eventUtils'
export const config = createCommandConfig({
  description: 'Cancel a scheduled game day',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with the game day to cancel',
      type: 'role',
      required: true
    }
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator
} as const)
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const role = interaction.options.getRole('role', true)
    const roleId = role.id
    const gameDay = await getGameDayByRoleId(roleId)
    if (!gameDay) {
      return interaction.reply({
        content: `The role <@&${roleId}> is not associated with any game day. Please provide a valid game day role.`,
        flags: MessageFlags.Ephemeral
      })
    }
    if (gameDay.status === 'CANCELLED') {
      return interaction.reply({
        content: `The game day "${gameDay.title}" is already cancelled.`,
        flags: MessageFlags.Ephemeral
      })
    }
    const updatedGameDay = await updateGameDay(gameDay.id, {
      status: 'CANCELLED'
    })
    if (!updatedGameDay) {
      return interaction.reply({
        content: 'Failed to cancel the game day. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
    const schedulingChannel = await getSchedulingChannel(interaction.guildId!)
    if (!schedulingChannel) {
      logger.error('Failed to get scheduling channel for announcement update')
      return interaction.reply({
        content: `Game day "${gameDay.title}" has been cancelled, but failed to update the announcement message. The scheduling channel could not be found.`,
        flags: MessageFlags.Ephemeral
      })
    }
    try {
      const messages = await schedulingChannel.messages.fetch({ limit: 100 })
      const announcementMessage = messages.find((message) => {
        if (message.embeds.length === 0) return false
        return message.embeds.some((embed) =>
          embed.footer?.text?.includes(`Game Day ID: ${gameDay.id}`)
        )
      })
      if (announcementMessage) {
        const cancelledEmbed = new EmbedBuilder()
          .setTitle(`${gameDay.title} - CANCELLED`)
          .setDescription('This game day has been cancelled.')
          .setColor(Colors.Red)
          .setFooter({ text: `Game Day ID: ${gameDay.id}` })
          .setTimestamp()
        await announcementMessage.edit({
          content: null, 
          embeds: [cancelledEmbed],
          components: [] 
        })
        logger.info(
          `Updated announcement message for cancelled game day: ${gameDay.id}`
        )
        let channelsDeleted = false
        if (gameDay.discord_category_id) {
          channelsDeleted = await deleteGameDayChannels(
            interaction.guild!,
            gameDay.discord_category_id
          )
          if (channelsDeleted) {
            logger.info(
              `Deleted channels for cancelled game day: ${gameDay.id}`
            )
          } else {
            logger.warn(
              `Failed to delete channels for cancelled game day: ${gameDay.id}`
            )
          }
        }
        let eventDeleted = false
        let eventErrorMessage = ''
        if (gameDay.discord_event_id) {
          try {
            const guild = interaction.guild!
            eventDeleted = await safelyDeleteEvent(
              guild,
              gameDay.discord_event_id
            )
            if (eventDeleted) {
              logger.info(
                `Deleted Discord scheduled event for cancelled game day: ${gameDay.id}`
              )
            } else {
              logger.warn(
                `Discord scheduled event not found for cancelled game day: ${gameDay.id}`
              )
            }
          } catch (error) {
            if (error instanceof EventError) {
              eventErrorMessage = getUserFriendlyEventErrorMessage(error)
              logger.error(
                `Event error for cancelled game day ${gameDay.id}: ${error.message}`,
                error.originalError
              )
            } else {
              logger.error(
                `Failed to delete Discord scheduled event for cancelled game day: ${gameDay.id}`,
                error
              )
              eventErrorMessage =
                'An unknown error occurred while deleting the Discord scheduled event.'
            }
          }
        }
        let replyContent = `Game day "${gameDay.title}" has been cancelled and the announcement has been updated.${
          channelsDeleted ? ' All associated channels have been deleted.' : ''
        }`
        if (gameDay.discord_event_id) {
          if (eventDeleted) {
            replyContent += ' The Discord scheduled event has been deleted.'
          } else if (eventErrorMessage) {
            replyContent += ` There was an issue deleting the Discord scheduled event: ${eventErrorMessage}`
          } else {
            replyContent +=
              ' The Discord scheduled event could not be found (it may have been deleted already).'
          }
        }
        return interaction.reply({
          content: replyContent,
          flags: MessageFlags.Ephemeral
        })
      } else {
        logger.warn(
          `Could not find announcement message for game day: ${gameDay.id}`
        )
        return interaction.reply({
          content: `Game day "${gameDay.title}" has been cancelled, but the announcement message could not be found. It may have been deleted or is too old.`,
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (error) {
      logger.error('Error updating announcement message:', error)
      return interaction.reply({
        content: `Game day "${gameDay.title}" has been cancelled, but failed to update the announcement message due to an error.`,
        flags: MessageFlags.Ephemeral
      })
    }
  } catch (error) {
    logger.error('Error in game_day cancel command:', error)
    try {
      if (interaction.deferred) {
        await interaction.reply({
          content:
            'An error occurred while cancelling the game day. Please try again later.',
          flags: MessageFlags.Ephemeral
        })
      } else {
        await interaction.reply({
          content:
            'An error occurred while cancelling the game day. Please try again later.',
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (replyError) {
      logger.error('Error replying to interaction:', replyError)
    }
  }
}
