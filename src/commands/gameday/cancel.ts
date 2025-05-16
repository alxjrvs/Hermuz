import { createCommandConfig, logger } from 'robo.js';
import { type ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getGameDay, cancelGameDay } from '../../models/gameDay';
import { getGame } from '../../models/game';
import { getOrCreateUser } from '../../models/user';
import { getGameDayAttendances } from '../../models/attendance';
import { createGameDayEmbed } from '../../utils/formatters';

export const config = createCommandConfig({
  description: 'Cancel a scheduled game day',
  defaultMemberPermissions: PermissionFlagsBits.ManageEvents,
  options: [
    {
      name: 'gameday',
      description: 'The ID of the game day to cancel',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'reason',
      description: 'The reason for cancellation',
      type: 'string',
      required: false
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
    const gameDayId = interaction.options.getString('gameday', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Get game day from database
    const gameDay = await getGameDay(gameDayId);
    
    if (!gameDay) {
      return interaction.editReply('Game day not found. Please select a valid game day.');
    }
    
    if (gameDay.status !== 'scheduled') {
      return interaction.editReply(`This game day is already ${gameDay.status}.`);
    }
    
    // Check if user is the host or has manage events permission
    const isHost = gameDay.host_user_id === user.discord_id;
    const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents);
    
    if (!isHost && !hasPermission) {
      return interaction.editReply('You do not have permission to cancel this game day. Only the host or users with Manage Events permission can cancel game days.');
    }
    
    // Cancel the game day
    const updatedGameDay = await cancelGameDay(gameDayId);
    
    if (!updatedGameDay) {
      return interaction.editReply('Failed to cancel the game day. Please try again later.');
    }
    
    // Get game from database
    const game = await getGame(updatedGameDay.game_id);
    
    if (!game) {
      return interaction.editReply('Game not found for this game day.');
    }
    
    // Get all attendances for the game day
    const attendances = await getGameDayAttendances(gameDayId);
    
    // Create embed for the game day
    const embed = createGameDayEmbed(updatedGameDay, game, attendances);
    
    // Create cancellation message
    const cancellationMessage = `<@&${game.discord_role_id}> Game day **${updatedGameDay.title}** has been cancelled.\nReason: ${reason}`;
    
    return interaction.editReply({
      content: cancellationMessage,
      embeds: [embed]
    });
  } catch (error) {
    logger.error('Error in gameday/cancel command:', error);
    return interaction.editReply('An error occurred while cancelling the game day. Please try again later.');
  }
};

export const autocomplete = async (interaction: any) => {
  try {
    const gameDays = await getScheduledGameDays();
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    const filtered = gameDays
      .filter(gameDay => 
        gameDay.id.toLowerCase().includes(focusedValue) || 
        gameDay.title.toLowerCase().includes(focusedValue)
      )
      .slice(0, 25); // Discord has a limit of 25 choices
    
    return filtered.map(gameDay => ({
      name: `${gameDay.title} (${new Date(gameDay.date_time).toLocaleDateString()})`,
      value: gameDay.id
    }));
  } catch (error) {
    logger.error('Error in gameday/cancel autocomplete:', error);
    return [];
  }
};

// Helper function to get scheduled game days for autocomplete
const getScheduledGameDays = async () => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .eq('status', 'scheduled')
      .order('date_time')
      .limit(100);
      
    if (error) {
      logger.error('Error fetching scheduled game days:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error('Error in getScheduledGameDays:', error);
    return [];
  }
};

// Import here to avoid circular dependency
import { supabase } from '../../utils/supabase';
