import {
  createGameDayTasks,
  type GameDayTask,
  getGameDay,
  getGameDayTasks,
  getTaskTemplatesByGame
} from '@hermuz/db'
import { type Client, Colors, EmbedBuilder } from 'discord.js'
import { logger } from '~/utils/logger'
import { getGameDayChannel, upsertChannelMessage } from './notifyService'

/**
 * Materialize a game day's checklist from its game's task templates. Idempotent:
 * only seeds when the game day has no tasks yet, so re-running never duplicates.
 * Returns the tasks that were created.
 */
export async function materializeTasksFromTemplates(
  gameDayId: string
): Promise<GameDayTask[]> {
  const gameDay = await getGameDay(gameDayId)
  if (!gameDay?.gameId) return []
  const existing = await getGameDayTasks(gameDayId)
  if (existing.length > 0) return []
  const templates = await getTaskTemplatesByGame(gameDay.gameId)
  if (templates.length === 0) return []
  return createGameDayTasks(
    templates.map((t, i) => ({
      gameDayId,
      templateId: t.id,
      label: t.label,
      description: t.description,
      sortOrder: t.sortOrder ?? i
    }))
  )
}

function checklistEmbed(title: string, tasks: GameDayTask[]): EmbedBuilder {
  const done = tasks.filter((t) => t.done).length
  const lines = tasks.length
    ? tasks
        .map((t) => {
          const box = t.done ? '✅' : '⬜'
          const who = t.assigneeUserId ? ` — <@${t.assigneeUserId}>` : ''
          return `${box} ${t.label}${who}`
        })
        .join('\n')
    : 'No setup tasks yet.'
  return new EmbedBuilder()
    .setTitle(`🧰 Setup checklist — ${title}`)
    .setColor(
      done === tasks.length && tasks.length > 0 ? Colors.Green : Colors.Yellow
    )
    .setDescription(lines)
    .setFooter({ text: `${done}/${tasks.length} done` })
}

/**
 * Post or update the live checklist message in the game day's `logistics`
 * channel. Tracks the message id on the game day (reusing `announcementMessageId`
 * would clash, so we store it via a dedicated field-free lookup: the logistics
 * channel only ever holds this one bot message, so we re-find by author+embed).
 */
export async function renderChecklist(
  client: Client,
  gameDayId: string
): Promise<void> {
  try {
    const gameDay = await getGameDay(gameDayId)
    if (!gameDay) return
    const channel = await getGameDayChannel(client, gameDay, 'logistics')
    if (!channel) return
    const tasks = await getGameDayTasks(gameDayId)
    const embed = checklistEmbed(gameDay.title, tasks)

    // The logistics channel is private to this game day and only the bot posts
    // the checklist there, so we can safely reuse the newest bot message.
    const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null)
    const mine = recent?.find(
      (m) =>
        m.author.id === client.user?.id && m.embeds[0]?.title?.startsWith('🧰')
    )
    await upsertChannelMessage(channel, mine?.id ?? null, { embeds: [embed] })
  } catch (err) {
    logger.error('Error rendering checklist:', err)
  }
}
