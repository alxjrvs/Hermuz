import { logger } from 'robo.js'
import type { MiddlewareData } from 'robo.js'
import { getDiscordServerByDiscordId } from '../models/discordServer'
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js'
import { MessageFlags } from 'discord.js'

/**
 * Middleware that checks if a Discord server record exists for the guild where the interaction was triggered.
 * If no record exists, it rejects the interaction and tells the user to reinstall the bot.
 */
export default async function serverCheckMiddleware(data: MiddlewareData): Promise<{ abort: boolean } | void> {
	// Skip for events and DM interactions
	if (data.record.type === 'event') {
		return
	}

	const [interaction] = data.payload as [ChatInputCommandInteraction | ContextMenuCommandInteraction]

	// Skip if not in a guild (e.g., DM)
	if (!interaction.guild) {
		return
	}

	try {
		// Get the guild ID from the interaction
		const guildId = interaction.guild.id

		// Check if a server record exists for this guild
		const server = await getDiscordServerByDiscordId(guildId)

		// If no server record exists, reject the interaction
		if (!server) {
			logger.warn(`No server record found for guild ${interaction.guild.name} (${guildId})`)

			await interaction.reply({
				content: 'This bot needs to be reinstalled. Please kick the bot and invite it again.',
				flags: MessageFlags.Ephemeral
			})

			return { abort: true }
		}

		// Server record exists, allow the interaction to proceed
		logger.debug(`Server record found for guild ${interaction.guild.name} (${guildId})`)
	} catch (error) {
		// Log the error but allow the interaction to proceed to avoid blocking all commands
		// if there's a database issue
		logger.error('Error in server check middleware:', error)
	}
}
