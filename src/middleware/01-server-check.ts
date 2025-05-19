import { logger } from 'robo.js'
import type { MiddlewareData } from 'robo.js'
import { getDiscordServerByDiscordId } from '../models/discordServer'
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction
} from 'discord.js'
import { MessageFlags } from 'discord.js'
export default async function serverCheckMiddleware(
  data: MiddlewareData
): Promise<{ abort: boolean } | void> {
  if (data.record.type === 'event') {
    return
  }
  const [interaction] = data.payload as [
    ChatInputCommandInteraction | ContextMenuCommandInteraction
  ]
  if (!interaction.guild) {
    return
  }
  try {
    const guildId = interaction.guild.id
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      logger.warn(
        `No server record found for guild ${interaction.guild.name} (${guildId})`
      )
      await interaction.reply({
        content:
          'This bot needs to be reinstalled. Please kick the bot and invite it again.',
        flags: MessageFlags.Ephemeral
      })
      return { abort: true }
    }
    logger.debug(
      `Server record found for guild ${interaction.guild.name} (${guildId})`
    )
  } catch (error) {
    logger.error('Error in server check middleware:', error)
  }
}
