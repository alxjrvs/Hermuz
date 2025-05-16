import { createCommandConfig, logger } from 'robo.js';
import { type ChatInputCommandInteraction } from 'discord.js';
import { getGameDay } from '../../models/gameDay';
import { getGame } from '../../models/game';
import { getOrCreateUser } from '../../models/user';
import { updateUserAttendance, getGameDayAttendances } from '../../models/attendance';
import { createGameDayEmbed } from '../../utils/formatters';
import type { Attendance } from '../../utils/supabase';

export const config = createCommandConfig({
  description: 'RSVP to a game day',
  options: [
    {
      name: 'gameday',
      description: 'The ID of the game day',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'status',
      description: 'Your RSVP status',
      type: 'string',
      required: true,
      choices: [
        { name: 'Interested', value: 'interested' },
        { name: 'Confirmed', value: 'confirmed' },
        { name: 'Declined', value: 'declined' }
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
    const gameDayId = interaction.options.getString('gameday', true);
    const status = interaction.options.getString('status', true) as Attendance['status'];
    
    // Get game day from database
    const gameDay = await getGameDay(gameDayId);
    
    if (!gameDay) {
      return interaction.editReply('Game day not found. Please select a valid game day.');
    }
    
    if (gameDay.status !== 'scheduled') {
      return interaction.editReply(`Cannot RSVP to a ${gameDay.status} game day.`);
    }
    
    // Get game from database
    const game = await getGame(gameDay.game_id);
    
    if (!game) {
      return interaction.editReply('Game not found for this game day.');
    }
    
    // Update user attendance
    const attendance = await updateUserAttendance(gameDayId, user.discord_id, status);
    
    if (!attendance) {
      return interaction.editReply('Failed to update your RSVP. Please try again later.');
    }
    
    // Get all attendances for the game day
    const attendances = await getGameDayAttendances(gameDayId);
    
    // Create embed for the game day
    const embed = createGameDayEmbed(gameDay, game, attendances);
    
    // Create response message
    let responseMessage = '';
    
    switch (status) {
      case 'interested':
        responseMessage = 'You have marked yourself as interested in this game day.';
        break;
      case 'confirmed':
        responseMessage = 'You have confirmed your attendance for this game day.';
        break;
      case 'declined':
        responseMessage = 'You have declined this game day.';
        break;
      default:
        responseMessage = `Your RSVP status has been updated to ${status}.`;
    }
    
    return interaction.editReply({
      content: responseMessage,
      embeds: [embed]
    });
  } catch (error) {
    logger.error('Error in gameday/rsvp command:', error);
    return interaction.editReply('An error occurred while updating your RSVP. Please try again later.');
  }
};

export const autocomplete = async (interaction: any) => {
  try {
    const gameDays = await getUpcomingGameDays();
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
    logger.error('Error in gameday/rsvp autocomplete:', error);
    return [];
  }
};

// Import here to avoid circular dependency
import { getUpcomingGameDays } from '../../models/gameDay';
