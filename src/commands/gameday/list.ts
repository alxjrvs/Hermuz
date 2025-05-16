import { createCommandConfig, logger } from 'robo.js';
import { EmbedBuilder, Colors, type ChatInputCommandInteraction } from 'discord.js';
import { getUpcomingGameDays } from '../../models/gameDay';
import { getGame } from '../../models/game';
import { getOrCreateUser } from '../../models/user';
import { formatDate } from '../../utils/formatters';

export const config = createCommandConfig({
  description: 'List upcoming game days'
} as const);

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();
  
  try {
    // Get user from database or create if not exists
    const user = await getOrCreateUser(
      interaction.user.id,
      interaction.user.username
    );
    
    if (!user) {
      return interaction.editReply('Failed to create or retrieve user record.');
    }
    
    // Get upcoming game days
    const gameDays = await getUpcomingGameDays();
    
    if (gameDays.length === 0) {
      return interaction.editReply('No upcoming game days scheduled. Use `/gameday create` to schedule one.');
    }
    
    // Create embed with game day list
    const embed = new EmbedBuilder()
      .setTitle('Upcoming Game Days')
      .setColor(Colors.Green)
      .setDescription('Here are the upcoming scheduled game days:')
      .setTimestamp();
    
    // Add each game day to the embed
    for (const gameDay of gameDays) {
      const game = await getGame(gameDay.game_id);
      
      if (!game) {
        logger.error(`Game not found for game day ${gameDay.id}`);
        continue;
      }
      
      embed.addFields({
        name: `${formatDate(gameDay.date_time)} - ${gameDay.title}`,
        value: `Game: ${game.name}\nLocation: ${gameDay.location}\nID: ${gameDay.id}`
      });
    }
    
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error in gameday/list command:', error);
    return interaction.editReply('An error occurred while fetching game days. Please try again later.');
  }
};
