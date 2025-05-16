import { EmbedBuilder, Colors } from 'discord.js'
import type { GameDay, Game, Attendance } from './supabase'

/**
 * Format a date string to a human-readable format
 */
export const formatDate = (dateString: string): string => {
	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	})
}

/**
 * Create an embed for a game day
 */
export const createGameDayEmbed = (gameDay: GameDay, game: Game, attendances: Attendance[]): EmbedBuilder => {
	// Count attendances by status
	const confirmedCount = attendances.filter((a) => a.status === 'confirmed').length
	const interestedCount = attendances.filter((a) => a.status === 'interested').length
	const declinedCount = attendances.filter((a) => a.status === 'declined').length
	const waitlistedCount = attendances.filter((a) => a.status === 'waitlisted').length

	// Determine color based on status
	let color: number
	if (gameDay.status === 'canceled') {
		color = Colors.Red
	} else if (gameDay.status === 'completed') {
		color = Colors.Grey
	} else {
		color = Colors.Green
	}

	return new EmbedBuilder()
		.setTitle(gameDay.title)
		.setDescription(gameDay.description)
		.setColor(color)
		.addFields(
			{ name: 'Game', value: game.name, inline: true },
			{ name: 'Date & Time', value: formatDate(gameDay.date_time), inline: true },
			{ name: 'Location', value: gameDay.location, inline: true },
			{ name: 'Status', value: capitalizeFirstLetter(gameDay.status), inline: true },
			{ name: 'Min Players', value: game.min_players.toString(), inline: true },
			{ name: 'Max Players', value: game.max_players.toString(), inline: true },
			{ name: 'Duration', value: `${game.duration} minutes`, inline: true },
			{ name: 'Complexity', value: `${game.complexity_rating}/5`, inline: true },
			{
				name: 'Attendance',
				value: `👍 Confirmed: ${confirmedCount}\n🤔 Interested: ${interestedCount}\n👎 Declined: ${declinedCount}\n⏳ Waitlisted: ${waitlistedCount}`,
				inline: false
			}
		)
		.setFooter({ text: `Game Day ID: ${gameDay.id}` })
		.setTimestamp(new Date(gameDay.updated_at))
}

/**
 * Create an embed for a game
 */
export const createGameEmbed = (game: Game): EmbedBuilder => {
	return new EmbedBuilder()
		.setTitle(game.name)
		.setDescription(game.description)
		.setColor(Colors.Blue)
		.addFields(
			{ name: 'Min Players', value: game.min_players.toString(), inline: true },
			{ name: 'Max Players', value: game.max_players.toString(), inline: true },
			{ name: 'Duration', value: `${game.duration} minutes`, inline: true },
			{ name: 'Complexity', value: `${game.complexity_rating}/5`, inline: true },
			{ name: 'Discord Role', value: `<@&${game.discord_role_id}>`, inline: true }
		)
		.setFooter({ text: `Game ID: ${game.id}` })
}

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirstLetter = (string: string): string => {
	return string.charAt(0).toUpperCase() + string.slice(1)
}
