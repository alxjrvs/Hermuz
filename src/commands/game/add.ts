import { createCommandConfig, logger } from 'robo.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { createGame } from '../../models/game';
import { getOrCreateUser } from '../../models/user';

export const config = createCommandConfig({
  description: 'Add a new game to the database',
  options: [
    {
      name: 'name',
      description: 'The name of the game',
      type: 'string',
      required: true
    },
    {
      name: 'description',
      description: 'A description of the game',
      type: 'string',
      required: true
    },
    {
      name: 'role',
      description: 'The Discord role associated with this game',
      type: 'role',
      required: true
    },
    {
      name: 'min_players',
      description: 'The minimum number of players',
      type: 'integer',
      required: true
    },
    {
      name: 'max_players',
      description: 'The maximum number of players',
      type: 'integer',
      required: true
    },
    {
      name: 'duration',
      description: 'The average duration of the game in minutes',
      type: 'integer',
      required: true
    },
    {
      name: 'complexity',
      description: 'The complexity rating of the game (1-5)',
      type: 'integer',
      required: true,
      choices: [
        { name: '1 - Very Easy', value: 1 },
        { name: '2 - Easy', value: 2 },
        { name: '3 - Medium', value: 3 },
        { name: '4 - Hard', value: 4 },
        { name: '5 - Very Hard', value: 5 }
      ]
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
    const name = interaction.options.getString('name', true);
    const description = interaction.options.getString('description', true);
    const role = interaction.options.getRole('role', true);
    const minPlayers = interaction.options.getInteger('min_players', true);
    const maxPlayers = interaction.options.getInteger('max_players', true);
    const duration = interaction.options.getInteger('duration', true);
    const complexity = interaction.options.getInteger('complexity', true);
    
    // Validate inputs
    if (minPlayers < 1) {
      return interaction.editReply('Minimum players must be at least 1.');
    }
    
    if (maxPlayers < minPlayers) {
      return interaction.editReply('Maximum players must be greater than or equal to minimum players.');
    }
    
    if (duration < 1) {
      return interaction.editReply('Duration must be at least 1 minute.');
    }
    
    // Create game in database
    const game = await createGame({
      name,
      description,
      discord_role_id: role.id,
      min_players: minPlayers,
      max_players: maxPlayers,
      duration,
      complexity_rating: complexity
    });
    
    if (!game) {
      return interaction.editReply('Failed to create game. Please try again later.');
    }
    
    return interaction.editReply(`Successfully added game: **${game.name}**`);
  } catch (error) {
    logger.error('Error in game/add command:', error);
    return interaction.editReply('An error occurred while adding the game. Please try again later.');
  }
};
