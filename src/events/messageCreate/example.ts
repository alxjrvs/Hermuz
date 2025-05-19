import { logger } from 'robo.js'
import type { Message } from 'discord.js'
export default (message: Message) => {
  logger.info(`${message.author} sent message: ${message.content}`)
}
