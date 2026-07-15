import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { getUpcomingGameDaysByStatus, getGame } from '@hermuz/db'
import { BRAND, BRAND_AUTHOR } from '~/utils/brand'
export const config = createCommandConfig({
  description: 'List all scheduled or scheduling game days in the future'
})
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply()
    const gameDays = await getUpcomingGameDaysByStatus(['CLOSED', 'SCHEDULING'])
    if (gameDays.length === 0) {
      return interaction.editReply(
        'No upcoming game days found. Use `/game_day schedule` to create a new game day.'
      )
    }
    const embed = new EmbedBuilder()
      .setAuthor(BRAND_AUTHOR)
      .setTitle('Upcoming Game Days')
      .setColor(BRAND.brass)
      .setDescription('Here are all the upcoming game days:')
      .setTimestamp()
    for (const gameDay of gameDays) {
      const date = new Date(gameDay.dateTime)
      const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      let gameInfo = 'No specific game'
      if (gameDay.gameId) {
        const game = await getGame(gameDay.gameId)
        if (game) {
          gameInfo = `${game.name} (${game.shortName})`
        }
      }
      embed.addFields({
        name: `${gameDay.title} - ${formattedDate}`,
        value:
          `**Status:** ${gameDay.status}\n` +
          `**Location:** ${gameDay.location || 'Not specified'}\n` +
          `**Game:** ${gameInfo}\n` +
          `**Host:** <@${gameDay.hostUserId}>\n` +
          `**Role:** ${gameDay.discordRoleId ? `<@&${gameDay.discordRoleId}>` : 'None'}`
      })
    }
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    logger.error('Error in game_day list command:', error)
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
