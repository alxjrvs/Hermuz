import { createCommandConfig, logger } from 'robo.js'
import { type ChatInputCommandInteraction } from 'discord.js'
import { getGameDay } from '../../models/gameDay'
import { getGame } from '../../models/game'
import { getOrCreateUser } from '../../models/user'
import { getGameDayAttendances } from '../../models/attendance'
import { createGameDayEmbed } from '../../utils/formatters'

export const config = createCommandConfig({
	description: 'View details of a game day',
	options: [
		{
			name: 'gameday',
			description: 'The ID of the game day',
			type: 'string',
			required: true,
			autocomplete: true
		}
	]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
	await interaction.deferReply()

	try {
		// Get user from database or create if not exists
		const user = await getOrCreateUser(interaction.user.id, interaction.user.username)

		if (!user) {
			return interaction.editReply('Failed to create or retrieve user record.')
		}

		// Get command options
		const gameDayId = interaction.options.getString('gameday', true)

		// Get game day from database
		const gameDay = await getGameDay(gameDayId)

		if (!gameDay) {
			return interaction.editReply('Game day not found. Please select a valid game day.')
		}

		// Get game from database
		if (!gameDay.game_id) {
			return interaction.editReply('Game ID not found for this game day.')
		}
		const game = await getGame(gameDay.game_id)

		if (!game) {
			return interaction.editReply('Game not found for this game day.')
		}

		// Get all attendances for the game day
		const attendances = await getGameDayAttendances(gameDayId)

		// Create embed for the game day
		const embed = createGameDayEmbed(gameDay, game, attendances)

		return interaction.editReply({ embeds: [embed] })
	} catch (error) {
		logger.error('Error in gameday/view command:', error)
		return interaction.editReply('An error occurred while fetching the game day. Please try again later.')
	}
}

export const autocomplete = async (interaction: any) => {
	try {
		const gameDays = await getAllGameDays()
		const focusedValue = interaction.options.getFocused().toLowerCase()

		const filtered = gameDays
			.filter(
				(gameDay) =>
					gameDay.id.toLowerCase().includes(focusedValue) || gameDay.title.toLowerCase().includes(focusedValue)
			)
			.slice(0, 25) // Discord has a limit of 25 choices

		return filtered.map((gameDay) => ({
			name: `${gameDay.title} (${new Date(gameDay.date_time).toLocaleDateString()})`,
			value: gameDay.id
		}))
	} catch (error) {
		logger.error('Error in gameday/view autocomplete:', error)
		return []
	}
}

// Helper function to get all game days for autocomplete
const getAllGameDays = async () => {
	try {
		const { data, error } = await supabase
			.from('game_days')
			.select('*')
			.order('date_time', { ascending: false })
			.limit(100)

		if (error) {
			logger.error('Error fetching all game days:', error)
			return []
		}

		return data || []
	} catch (error) {
		logger.error('Error in getAllGameDays:', error)
		return []
	}
}

// Import here to avoid circular dependency
import { supabase } from '../../utils/supabase'
