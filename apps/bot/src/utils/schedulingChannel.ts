import { ChannelType, type Client, type TextChannel } from 'discord.js'
import { getSchedulingChannelId } from '@hermuz/db'
import { logger } from '~/utils/logger'

/**
 * Resolve the single-server scheduling channel (replaces the old per-server
 * `getSchedulingChannel(guildId)` that read `discord_servers.scheduling_channel_id`).
 * The channel id now lives in the `settings` table, set via `/set_scheduling_channel`.
 */
export async function getSchedulingChannel(
  client: Client
): Promise<TextChannel | null> {
  try {
    const id = await getSchedulingChannelId()
    if (!id) return null
    const channel = await client.channels.fetch(id)
    if (!channel || channel.type !== ChannelType.GuildText) return null
    return channel as TextChannel
  } catch (error) {
    logger.error('Error resolving scheduling channel:', error)
    return null
  }
}
