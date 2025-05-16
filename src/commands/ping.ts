import { createCommandConfig, logger } from 'robo.js'
import type { ChatInputCommandInteraction } from 'discord.js'

export const config = createCommandConfig({
	description: 'Replies with Pong!'
} as const)

export default (interaction: ChatInputCommandInteraction) => {
	logger.info(`Ping command used by ${interaction.user}`)

	interaction.reply('Pong!')
}
