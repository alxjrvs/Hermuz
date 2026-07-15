import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
export const config = createCommandConfig({
  description: 'Replies with Pong!'
})
export default (interaction: ChatInputCommandInteraction) => {
  logger.info(`Ping command used by ${interaction.user}`)
  interaction.reply('Pong!')
}
