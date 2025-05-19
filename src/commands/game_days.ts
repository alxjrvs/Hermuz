import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  MessageFlags
} from 'discord.js'
import { getUpcomingGameDaysByStatus } from '../models/gameDay'
import { getDiscordServerByDiscordId } from '../models/discordServer'
import { getGame } from '../models/game'

export const config = createCommandConfig({
  description: 'List all scheduled or scheduling game days in the future'
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply()

    // Get the server record
    const server = await getDiscordServerByDiscordId(interaction.guildId!)
    if (!server) {
      return interaction.editReply(
        'Failed to retrieve server record. Please try again later.'
      )
    }

    // Get all future game days with status CLOSED or SCHEDULING
    const gameDays = await getUpcomingGameDaysByStatus(['CLOSED', 'SCHEDULING'])

    if (gameDays.length === 0) {
      return interaction.editReply(
        'No upcoming game days found. Use `/schedule` to create a new game day.'
      )
    }

    // Create an embed to display the game days
    const embed = new EmbedBuilder()
      .setTitle('Upcoming Game Days')
      .setColor(Colors.Blue)
      .setDescription('Here are all the upcoming game days:')
      .setTimestamp()

    // Process each game day
    for (const gameDay of gameDays) {
      // Format the date
      const date = new Date(gameDay.date_time)
      const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Get the game information if available
      let gameInfo = 'No specific game'
      if (gameDay.game_id) {
        const game = await getGame(gameDay.game_id)
        if (game) {
          gameInfo = `${game.name} (${game.short_name})`
        }
      }

      // Add a field for this game day
      embed.addFields({
        name: `${gameDay.title} - ${formattedDate}`,
        value:
          `**Status:** ${gameDay.status}\n` +
          `**Location:** ${gameDay.location || 'Not specified'}\n` +
          `**Game:** ${gameInfo}\n` +
          `**Host:** <@${gameDay.host_user_id}>\n` +
          `**Role:** ${gameDay.discord_role_id ? `<@&${gameDay.discord_role_id}>` : 'None'}`
      })
    }

    // Send the embed
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    logger.error('Error in game_days command:', error)
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        'An error occurred while listing game days. Please try again later.'
      )
    } else {
      await interaction.reply({
        content:
          'An error occurred while listing game days. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
