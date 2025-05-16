import { createCommandConfig, logger } from 'robo.js';
import { type ChatInputCommandInteraction } from 'discord.js';
import { getGame } from '../../models/game';
import { createGameDay } from '../../models/gameDay';
import { getOrCreateUser } from '../../models/user';
import { createGameDayEmbed } from '../../utils/formatters';

export const config = createCommandConfig({
  description: 'Create a new game day event',
  options: [
    {
      name: 'game',
      description: 'The game to play',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'title',
      description: 'The title of the game day',
      type: 'string',
      required: true
    },
    {
      name: 'description',
      description: 'A description of the game day',
      type: 'string',
      required: true
    },
    {
      name: 'date',
      description: 'The date of the game day (YYYY-MM-DD)',
      type: 'string',
      required: true
    },
    {
      name: 'time',
      description: 'The time of the game day (HH:MM)',
      type: 'string',
      required: true
    },
    {
      name: 'location',
      description: 'The location of the game day',
      type: 'string',
      required: true
    }
  ]
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
    
    // Get command options
    const gameId = interaction.options.getString('game', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const dateStr = interaction.options.getString('date', true);
    const timeStr = interaction.options.getString('time', true);
    const location = interaction.options.getString('location', true);
    
    // Get game from database
    const game = await getGame(gameId);
    
    if (!game) {
      return interaction.editReply('Game not found. Please select a valid game.');
    }
    
    // Validate and parse date and time
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    const dateTime = new Date(dateTimeStr);
    
    if (isNaN(dateTime.getTime())) {
      return interaction.editReply('Invalid date or time format. Please use YYYY-MM-DD for date and HH:MM for time.');
    }
    
    if (dateTime < new Date()) {
      return interaction.editReply('Game day cannot be scheduled in the past.');
    }
    
    // Create game day in database
    const gameDay = await createGameDay({
      game_id: gameId,
      host_user_id: user.discord_id,
      title,
      description,
      date_time: dateTime.toISOString(),
      location,
      status: 'scheduled'
    });
    
    if (!gameDay) {
      return interaction.editReply('Failed to create game day. Please try again later.');
    }
    
    // Create embed for the game day
    const embed = createGameDayEmbed(gameDay, game, []);
    
    // Mention the game role
    const roleMessage = `<@&${game.discord_role_id}> A new game day has been scheduled!`;
    
    return interaction.editReply({
      content: roleMessage,
      embeds: [embed]
    });
  } catch (error) {
    logger.error('Error in gameday/create command:', error);
    return interaction.editReply('An error occurred while creating the game day. Please try again later.');
  }
};

export const autocomplete = async (interaction: any) => {
  try {
    const games = await getAllGames();
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    const filtered = games
      .filter(game => game.name.toLowerCase().includes(focusedValue))
      .slice(0, 25); // Discord has a limit of 25 choices
    
    return filtered.map(game => ({
      name: game.name,
      value: game.id
    }));
  } catch (error) {
    logger.error('Error in gameday/create autocomplete:', error);
    return [];
  }
};

// Import here to avoid circular dependency
import { getAllGames } from '../../models/game';
