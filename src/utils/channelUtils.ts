import { logger } from 'robo.js'
import {
  ChannelType,
  Guild,
  PermissionFlagsBits,
  PermissionOverwriteOptions,
  Role
} from 'discord.js'
import type { CategoryChannel, TextChannel } from 'discord.js'

/**
 * Creates a private category with subchannels for a game day
 * Only administrators and users with the game day role can access the category and its channels
 * 
 * @param guild The Discord guild where the category will be created
 * @param categoryName The name of the category
 * @param gameDayRole The role that will have access to the category
 * @returns An object containing the created category and channels, or null if creation failed
 */
export const createGameDayChannels = async (
  guild: Guild,
  categoryName: string,
  gameDayRole: Role
): Promise<{
  category: CategoryChannel
  generalChannel: TextChannel
  logisticsChannel: TextChannel
  foodChannel: TextChannel
  gameChannel: TextChannel
} | null> => {
  try {
    // Define permission overwrites for the category
    const permissionOverwrites = [
      {
        // Deny access to @everyone
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        // Allow access to the game day role
        id: gameDayRole.id,
        allow: [PermissionFlagsBits.ViewChannel]
      }
    ]

    // Create the category
    const category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    }) as CategoryChannel

    logger.info(`Created category ${category.name} (${category.id}) for game day`)

    // Create the general channel
    const generalChannel = await category.children.create({
      name: 'general',
      type: ChannelType.GuildText,
      // Permissions will be inherited from the category
      topic: `General discussion for ${categoryName}`
    }) as TextChannel

    // Create the logistics channel
    const logisticsChannel = await category.children.create({
      name: 'logistics',
      type: ChannelType.GuildText,
      topic: `Logistics planning for ${categoryName}`
    }) as TextChannel

    // Create the food channel
    const foodChannel = await category.children.create({
      name: 'food',
      type: ChannelType.GuildText,
      topic: `Food planning for ${categoryName}`
    }) as TextChannel

    // Create the game channel
    const gameChannel = await category.children.create({
      name: 'game',
      type: ChannelType.GuildText,
      topic: `Game discussion for ${categoryName}`
    }) as TextChannel

    logger.info(`Created all channels for category ${category.name} (${category.id})`)

    return {
      category,
      generalChannel,
      logisticsChannel,
      foodChannel,
      gameChannel
    }
  } catch (error) {
    logger.error('Error creating game day channels:', error)
    return null
  }
}

/**
 * Deletes a game day category and all its channels
 * 
 * @param guild The Discord guild where the category exists
 * @param categoryId The ID of the category to delete
 * @returns True if deletion was successful, false otherwise
 */
export const deleteGameDayChannels = async (
  guild: Guild,
  categoryId: string
): Promise<boolean> => {
  try {
    // Fetch the category
    const category = await guild.channels.fetch(categoryId) as CategoryChannel

    if (!category) {
      logger.warn(`Category with ID ${categoryId} not found`)
      return false
    }

    // Delete all child channels
    for (const [, channel] of category.children.cache) {
      await channel.delete('Game day cancelled or deleted')
    }

    // Delete the category itself
    await category.delete('Game day cancelled or deleted')

    logger.info(`Deleted category ${categoryId} and all its channels`)
    return true
  } catch (error) {
    logger.error(`Error deleting game day channels for category ${categoryId}:`, error)
    return false
  }
}
