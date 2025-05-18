import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { getAllGames } from '../../models/game'
import { getDiscordServerByDiscordId } from '../../models/discordServer'

export const config = createCommandConfig({
  description: 'List all games set up in this server'
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

    // Get all games for this server
    const serverGames = await getAllGames(server.id)

    if (serverGames.length === 0) {
      return interaction.editReply(
        'No games have been set up in this server yet. Use `/game setup` to add a game.'
      )
    }

    // Create an embed to display the games
    const embed = new EmbedBuilder()
      .setTitle('Games in this Server')
      .setColor('#0099ff')
      .setDescription(
        'Here are all the games that have been set up in this server:'
      )
      .setTimestamp()

    // Add each game to the embed
    serverGames.forEach((game) => {
      embed.addFields({
        name: game.name,
        value:
          `**Description:** ${game.description || 'No description'}\n` +
          `**Players:** ${game.min_players || '?'}-${game.max_players || '?'}\n` +
          `**Duration:** ${game.duration || '?'} minutes\n` +
          `**Role:** <@&${game.discord_role_id}>`
      })
    })

    // Send the embed
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    logger.error('Error in game list command:', error)
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        'An error occurred while listing games. Please try again later.'
      )
    } else {
      await interaction.reply({
        content:
          'An error occurred while listing games. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
