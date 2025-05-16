import { createCommandConfig, logger } from 'robo.js';
import { EmbedBuilder, Colors, type ChatInputCommandInteraction } from 'discord.js';
import { getAllGames } from '../../models/game';
import { getOrCreateUser } from '../../models/user';

export const config = createCommandConfig({
  description: 'List all available games'
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
    
    // Get all games from database
    const games = await getAllGames();
    
    if (games.length === 0) {
      return interaction.editReply('No games have been added yet. Use `/game add` to add a game.');
    }
    
    // Create embed with game list
    const embed = new EmbedBuilder()
      .setTitle('Available Games')
      .setColor(Colors.Blue)
      .setDescription('Here are all the games available for scheduling:')
      .setTimestamp();
    
    // Add each game to the embed
    games.forEach((game, index) => {
      embed.addFields({
        name: `${index + 1}. ${game.name}`,
        value: `Min: ${game.min_players} | Max: ${game.max_players} | Duration: ${game.duration} min | Complexity: ${game.complexity_rating}/5 | Role: <@&${game.discord_role_id}>`
      });
    });
    
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error in game/list command:', error);
    return interaction.editReply('An error occurred while fetching games. Please try again later.');
  }
};
