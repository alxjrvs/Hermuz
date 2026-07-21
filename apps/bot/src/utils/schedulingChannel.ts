import { type GameDay, getCampaign, getSchedulingChannelId } from '@hermuz/db'
import { ChannelType, type Client, type TextChannel } from 'discord.js'
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

/**
 * Resolve the channel a game day's announcement lives in. A REPEATING campaign's
 * sessions announce into the campaign's own channel (day-of reminders); every
 * other game day uses the global scheduling channel. Returns null for a
 * REPEATING session whose campaign has no channel wired yet.
 */
export async function getAnnouncementChannel(
  client: Client,
  gameDay: Pick<GameDay, 'campaignId'>
): Promise<TextChannel | null> {
  try {
    if (gameDay.campaignId) {
      const campaign = await getCampaign(gameDay.campaignId)
      if (campaign?.schedulingKind === 'REPEATING') {
        if (!campaign.discordChannelId) return null
        const channel = await client.channels.fetch(campaign.discordChannelId)
        if (!channel || channel.type !== ChannelType.GuildText) return null
        return channel as TextChannel
      }
    }
    return await getSchedulingChannel(client)
  } catch (error) {
    logger.error('Error resolving announcement channel:', error)
    return null
  }
}
