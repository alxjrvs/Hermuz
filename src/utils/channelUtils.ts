import { logger } from 'robo.js'
import { ChannelType, Guild, PermissionFlagsBits, Role } from 'discord.js'
import type { CategoryChannel, TextChannel, VoiceChannel } from 'discord.js'
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
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: gameDayRole.id,
        allow: [PermissionFlagsBits.ViewChannel]
      }
    ]
    const category = (await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    })) as CategoryChannel
    logger.info(
      `Created category ${category.name} (${category.id}) for game day`
    )
    const generalChannel = (await category.children.create({
      name: 'general',
      type: ChannelType.GuildText,
      topic: `General discussion for ${categoryName}`
    })) as TextChannel
    const logisticsChannel = (await category.children.create({
      name: 'logistics',
      type: ChannelType.GuildText,
      topic: `Logistics planning for ${categoryName}`
    })) as TextChannel
    const foodChannel = (await category.children.create({
      name: 'food',
      type: ChannelType.GuildText,
      topic: `Food planning for ${categoryName}`
    })) as TextChannel
    const gameChannel = (await category.children.create({
      name: 'game',
      type: ChannelType.GuildText,
      topic: `Game discussion for ${categoryName}`
    })) as TextChannel
    logger.info(
      `Created all channels for category ${category.name} (${category.id})`
    )
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
export const deleteGameDayChannels = async (
  guild: Guild,
  categoryId: string
): Promise<boolean> => {
  try {
    const category = (await guild.channels.fetch(categoryId)) as CategoryChannel
    if (!category) {
      logger.warn(`Category with ID ${categoryId} not found`)
      return false
    }
    for (const [, channel] of category.children.cache) {
      await channel.delete('Game day cancelled or deleted')
    }
    await category.delete('Game day cancelled or deleted')
    logger.info(`Deleted category ${categoryId} and all its channels`)
    return true
  } catch (error) {
    logger.error(
      `Error deleting game day channels for category ${categoryId}:`,
      error
    )
    return false
  }
}
export const createCampaignChannels = async (
  guild: Guild,
  categoryName: string,
  campaignRole: Role
): Promise<{
  category: CategoryChannel
  generalChannel: TextChannel
  characterBuildingChannel: TextChannel
  loreChannel: TextChannel
  rulesChannel: TextChannel
  randomChannel: TextChannel
  chatChannel: VoiceChannel
} | null> => {
  try {
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: campaignRole.id,
        allow: [PermissionFlagsBits.ViewChannel]
      }
    ]
    const category = (await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    })) as CategoryChannel
    logger.info(
      `Created category ${category.name} (${category.id}) for campaign`
    )
    const generalChannel = (await category.children.create({
      name: 'general',
      type: ChannelType.GuildText,
      topic: `General discussion for ${categoryName}`
    })) as TextChannel
    const characterBuildingChannel = (await category.children.create({
      name: 'character-building',
      type: ChannelType.GuildText,
      topic: `Character building for ${categoryName}`
    })) as TextChannel
    const loreChannel = (await category.children.create({
      name: 'lore',
      type: ChannelType.GuildText,
      topic: `Lore for ${categoryName}`
    })) as TextChannel
    const rulesChannel = (await category.children.create({
      name: 'rules',
      type: ChannelType.GuildText,
      topic: `Rules for ${categoryName}`
    })) as TextChannel
    const randomChannel = (await category.children.create({
      name: 'random',
      type: ChannelType.GuildText,
      topic: `Random discussions for ${categoryName}`
    })) as TextChannel
    const chatChannel = (await category.children.create({
      name: 'chat',
      type: ChannelType.GuildVoice
    })) as VoiceChannel
    logger.info(
      `Created all channels for category ${category.name} (${category.id})`
    )
    return {
      category,
      generalChannel,
      characterBuildingChannel,
      loreChannel,
      rulesChannel,
      randomChannel,
      chatChannel
    }
  } catch (error) {
    logger.error('Error creating campaign channels:', error)
    return null
  }
}
