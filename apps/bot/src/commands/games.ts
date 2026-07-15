import { getAllGames } from '@hermuz/db'
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { BRAND, BRAND_AUTHOR } from '~/utils/brand'
import { logger } from '~/utils/logger'
export const config = createCommandConfig({
  description: 'List all games set up in this server'
})
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply()
    const serverGames = await getAllGames()
    if (serverGames.length === 0) {
      return interaction.editReply(
        'No games have been set up in this server yet. Use `/game setup` to add a game.'
      )
    }
    const embed = new EmbedBuilder()
      .setAuthor(BRAND_AUTHOR)
      .setTitle('Games in this Server')
      .setColor(BRAND.accent)
      .setDescription(
        'Here are all the games that have been set up in this server:'
      )
      .setTimestamp()
    serverGames.forEach((game) => {
      embed.addFields({
        name: `${game.name} (${game.shortName})`,
        value:
          `**Description:** ${game.description || 'No description'}\n` +
          `**Players:** ${game.minPlayers || '?'}-${game.maxPlayers || '?'}\n` +
          `**Role:** <@&${game.discordRoleId}>`
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
