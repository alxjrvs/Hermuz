import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
import type { ChatInputCommandInteraction } from 'discord.js'
export const config = createCommandConfig({
  description: 'Replies with Pong!'
})
export default (interaction: ChatInputCommandInteraction) => {
  logger.info(`Ping command used by ${interaction.user}`)
  interaction.reply('Pong!')
}
