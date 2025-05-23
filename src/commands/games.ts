import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { getAllGames } from '../models/game'
import { getDiscordServerByDiscordId } from '../models/discordServer'
export const config = createCommandConfig({
  description: 'List all games set up in this server'
} as const)
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply()
    const server = await getDiscordServerByDiscordId(interaction.guildId!)
    if (!server) {
      return interaction.editReply(
        'Failed to retrieve server record. Please try again later.'
      )
    }
    const serverGames = await getAllGames(server.id)
    if (serverGames.length === 0) {
      return interaction.editReply(
        'No games have been set up in this server yet. Use `/game setup` to add a game.'
      )
    }
    const embed = new EmbedBuilder()
      .setTitle('Games in this Server')
      .setColor('#0099ff')
      .setDescription(
        'Here are all the games that have been set up in this server:'
      )
      .setTimestamp()
    serverGames.forEach((game) => {
      embed.addFields({
        name: `${game.name} (${game.short_name})`,
        value:
          `**Description:** ${game.description || 'No description'}\n` +
          `**Players:** ${game.min_players || '?'}-${game.max_players || '?'}\n` +
          `**Role:** <@&${game.discord_role_id}>`
      })
    })
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
