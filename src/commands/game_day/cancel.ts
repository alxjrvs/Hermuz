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

    // Get the role argument
    const role = interaction.options.getRole('role', true)
    const roleId = role.id

    // Check if the role is associated with a game day
    const gameDay = await getGameDayByRoleId(roleId)
    if (!gameDay) {
      return interaction.reply({
        content: `The role <@&${roleId}> is not associated with any game day. Please provide a valid game day role.`,
        flags: MessageFlags.Ephemeral
      })
    }

    // Check if the game day is already cancelled
    if (gameDay.status === 'CANCELLED') {
      return interaction.reply({
        content: `The game day "${gameDay.title}" is already cancelled.`,
        flags: MessageFlags.Ephemeral
      })
    }

    // Update the game day status to CANCELLED
    const updatedGameDay = await updateGameDay(gameDay.id, {
      status: 'CANCELLED'
    })

    if (!updatedGameDay) {
      return interaction.reply({
        content: 'Failed to cancel the game day. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Get the scheduling channel
    const schedulingChannel = await getSchedulingChannel(interaction.guildId!)
    if (!schedulingChannel) {
      logger.error('Failed to get scheduling channel for announcement update')
      return interaction.reply({
        content: `Game day "${gameDay.title}" has been cancelled, but failed to update the announcement message. The scheduling channel could not be found.`,
        flags: MessageFlags.Ephemeral
      })
    }

    // Try to find the announcement message in the scheduling channel
    try {
      // Fetch recent messages in the scheduling channel
      const messages = await schedulingChannel.messages.fetch({ limit: 100 })

      // Look for a message with an embed that has the game day ID in the footer
      const announcementMessage = messages.find((message) => {
        // Check if the message has embeds
        if (message.embeds.length === 0) return false

        // Check if any embed has the game day ID in the footer
        return message.embeds.some((embed) =>
          embed.footer?.text?.includes(`Game Day ID: ${gameDay.id}`)
        )
      })

      if (announcementMessage) {
        // Create a new cancelled embed
        const cancelledEmbed = new EmbedBuilder()
          .setTitle(`${gameDay.title} - CANCELLED`)
          .setDescription('This game day has been cancelled.')
          .setColor(Colors.Red)
          .setFooter({ text: `Game Day ID: ${gameDay.id}` })
          .setTimestamp()

        // Update the message with the cancelled embed and remove buttons
        await announcementMessage.edit({
          content: null, // Remove any content
          embeds: [cancelledEmbed],
          components: [] // Remove all buttons
        })

        logger.info(
          `Updated announcement message for cancelled game day: ${gameDay.id}`
        )

        return interaction.reply({
          content: `Game day "${gameDay.title}" has been cancelled and the announcement has been updated.`,
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
