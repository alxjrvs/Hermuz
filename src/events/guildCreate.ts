import { logger } from 'robo.js'
import type { Guild } from 'discord.js'
import { getOrCreateDiscordServer } from '../models/discordServer'

/**
 * This event is triggered when the bot joins a new server
 * We'll use it to create a record in our database for the server
 */
export default async (guild: Guild) => {
  try {
    logger.info(`Bot joined a new server: ${guild.name} (${guild.id})`)

    // Create a record for the server in our database
    const server = await getOrCreateDiscordServer(guild.id)

    if (server) {
      logger.info(
        `Created/retrieved server record for ${guild.name} (${guild.id})`
      )
    } else {
      logger.error(
        `Failed to create server record for ${guild.name} (${guild.id})`
      )
    }
  } catch (error) {
    logger.error('Error in guildCreate event:', error)
  }
}
