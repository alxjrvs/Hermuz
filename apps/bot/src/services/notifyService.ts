import {
  ChannelType,
  type Client,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type TextChannel
} from 'discord.js'
import type { GameDay } from '@hermuz/db'
import { logger } from '~/utils/logger'

/**
 * The generic notify + response spine shared by meals, tasks, and reminders.
 * It does three things: DM a set of users, resolve a game day's per-topic
 * channel, and post-or-edit a single tracked message. Response *tracking* itself
 * lives in the feature's own tables (meal_responses, game_day_tasks); this
 * module is only the delivery/rendering half.
 */

/** Best-effort DM to each user. Returns how many were delivered. */
export async function dmUsers(
  client: Client,
  userIds: string[],
  content: string
): Promise<number> {
  let delivered = 0
  for (const id of new Set(userIds)) {
    try {
      const user = await client.users.fetch(id)
      await user.send(content)
      delivered++
    } catch (err) {
      // Users can have DMs closed — that's expected, not an error worth throwing.
      logger.debug(`Could not DM user ${id}:`, err)
    }
  }
  return delivered
}

/**
 * Resolve a named text child (e.g. `food`, `logistics`) of a game day's private
 * category. Returns null if the game day has no category or the channel is gone.
 */
export async function getGameDayChannel(
  client: Client,
  gameDay: GameDay,
  name: string
): Promise<TextChannel | null> {
  if (!gameDay.discordCategoryId) return null
  try {
    const category = await client.channels.fetch(gameDay.discordCategoryId)
    if (!category || category.type !== ChannelType.GuildCategory) return null
    const child = category.children.cache.find(
      (c) => c.name === name && c.type === ChannelType.GuildText
    )
    return (child as TextChannel) ?? null
  } catch (err) {
    logger.error(`Error resolving "${name}" channel for game day:`, err)
    return null
  }
}

/**
 * Post a new message or edit the existing one identified by `messageId`. Returns
 * the resulting message (whose id the caller should persist) or null on failure.
 * Falls back to posting fresh if the tracked message was deleted.
 */
export async function upsertChannelMessage(
  channel: TextChannel,
  messageId: string | null,
  payload: MessageCreateOptions & MessageEditOptions
): Promise<Message | null> {
  try {
    if (messageId) {
      try {
        const existing = await channel.messages.fetch(messageId)
        return await existing.edit(payload)
      } catch {
        // Tracked message vanished — fall through to a fresh post.
      }
    }
    return await channel.send(payload)
  } catch (err) {
    logger.error('Error upserting channel message:', err)
    return null
  }
}
