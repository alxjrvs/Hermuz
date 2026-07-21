import {
  type Attendance,
  getCampaign,
  getGame,
  getGameDay,
  getGameDayAttendances,
  getPlayersByCampaign,
  type Player,
  updateCampaign,
  updateGameDay
} from '@hermuz/db'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client
} from 'discord.js'
import { config } from '~/config'
import {
  createAttendanceButtonId,
  createCampaignInterestButtonId
} from '~/utils/buttonUtils'
import { createCampaignMessageEmbed } from '~/utils/campaignMessageUtils'
import { createGameDayMessageEmbed } from '~/utils/gameDayMessageUtils'
import { logger } from '~/utils/logger'
import {
  getAnnouncementChannel,
  getSchedulingChannel
} from '~/utils/schedulingChannel'
import { fail, ok, type ServiceResult } from './result'

interface AnnounceResult {
  messageLink: string
  alreadyAnnounced: boolean
}

function messageLink(channelId: string, messageId: string): string {
  return `https://discordapp.com/channels/${config.guildId}/${channelId}/${messageId}`
}

/**
 * Post (or report the existing) announcement for a game day into the scheduling
 * channel, with RSVP buttons. Mirrors the `/game_day announce` command.
 */
export async function announceGameDay(
  client: Client,
  id: string
): Promise<ServiceResult<AnnounceResult>> {
  const gameDay = await getGameDay(id)
  if (!gameDay) return fail('Game day not found.', 404)

  // REPEATING campaign sessions don't post to the global scheduling channel —
  // they get a day-of reminder in the campaign's own channel instead.
  if (gameDay.campaignId) {
    const campaign = await getCampaign(gameDay.campaignId)
    if (campaign?.schedulingKind === 'REPEATING') {
      return announceGameDayReminder(client, id)
    }
  }

  const channel = await getSchedulingChannel(client)
  if (!channel) {
    return fail('No scheduling channel has been set up.', 400)
  }

  if (gameDay.announcementMessageId) {
    try {
      const existing = await channel.messages.fetch(
        gameDay.announcementMessageId
      )
      if (existing) {
        return ok({
          messageLink: messageLink(channel.id, existing.id),
          alreadyAnnounced: true
        })
      }
    } catch (err) {
      logger.warn(`Could not fetch existing announcement message: ${err}`)
    }
  }

  const gameForEmbed = gameDay.gameId ? await getGame(gameDay.gameId) : null
  let attendances: Attendance[] = []
  try {
    attendances = await getGameDayAttendances(gameDay.id)
  } catch (err) {
    logger.error('Error fetching attendances:', err)
  }

  const embed = createGameDayMessageEmbed(gameDay, attendances, gameForEmbed)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('AVAILABLE', gameDay.id))
      .setLabel("I'm in")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('INTERESTED', gameDay.id))
      .setLabel("I'm Interested")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('NOT_AVAILABLE', gameDay.id))
      .setLabel('Not Available')
      .setStyle(ButtonStyle.Secondary)
  )

  let content = gameForEmbed?.discordRoleId
    ? `<@&${gameForEmbed.discordRoleId}>`
    : '@everyone'
  if (gameDay.discordEventId) {
    content += `\n\nJoin the Discord event: https://discord.com/events/${config.guildId}/${gameDay.discordEventId}`
  }

  const message = await channel.send({
    content,
    embeds: [embed],
    components: [actionRow]
  })
  await updateGameDay(gameDay.id, { announcementMessageId: message.id })

  if (gameDay.discordEventId) {
    try {
      const event = await channel.guild.scheduledEvents.fetch(
        gameDay.discordEventId
      )
      const link = messageLink(channel.id, message.id)
      await event.edit({
        description: `${gameDay.description || `Game day for ${gameDay.title}`}\n\nRSVP and discussion: ${link}`
      })
    } catch (err) {
      logger.error('Error updating event description with message link:', err)
    }
  }

  return ok({
    messageLink: messageLink(channel.id, message.id),
    alreadyAnnounced: false
  })
}

/**
 * Post the day-of game reminder for a REPEATING campaign's session into the
 * campaign's own channel. Attendance is assumed, so the only control is a single
 * "I can't make it" button (the existing NOT_AVAILABLE RSVP path). Idempotent on
 * the session's `announcementMessageId`. Scheduled to fire at 8am ET on game day
 * by the GAMEDAY_ANNOUNCE job.
 */
export async function announceGameDayReminder(
  client: Client,
  id: string
): Promise<ServiceResult<AnnounceResult>> {
  const gameDay = await getGameDay(id)
  if (!gameDay) return fail('Game day not found.', 404)
  if (gameDay.status === 'CANCELLED') return fail('Session is cancelled.', 409)
  if (!gameDay.campaignId) return fail('Not a campaign session.', 400)

  const campaign = await getCampaign(gameDay.campaignId)
  if (!campaign) return fail('Campaign not found.', 404)
  if (campaign.schedulingKind !== 'REPEATING') {
    return fail('Not a repeating campaign.', 400)
  }

  const channel = await getAnnouncementChannel(client, gameDay)
  if (!channel) {
    return fail('Campaign has no channel configured for reminders.', 400)
  }

  if (gameDay.announcementMessageId) {
    try {
      const existing = await channel.messages.fetch(
        gameDay.announcementMessageId
      )
      if (existing) {
        return ok({
          messageLink: messageLink(channel.id, existing.id),
          alreadyAnnounced: true
        })
      }
    } catch (err) {
      logger.warn(`Could not fetch existing reminder message: ${err}`)
    }
  }

  const gameForEmbed = gameDay.gameId ? await getGame(gameDay.gameId) : null
  let attendances: Attendance[] = []
  try {
    attendances = await getGameDayAttendances(gameDay.id)
  } catch (err) {
    logger.error('Error fetching attendances:', err)
  }

  const embed = createGameDayMessageEmbed(gameDay, attendances, gameForEmbed)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('NOT_AVAILABLE', gameDay.id))
      .setLabel("I can't make it")
      .setStyle(ButtonStyle.Danger)
  )

  const content = `<@&${campaign.discordRoleId}> **Game day today!** Attendance is assumed — tap below only if you can't make it.`

  const message = await channel.send({
    content,
    embeds: [embed],
    components: [actionRow]
  })
  await updateGameDay(gameDay.id, {
    status: 'SCHEDULING',
    announcementMessageId: message.id
  })

  return ok({
    messageLink: messageLink(channel.id, message.id),
    alreadyAnnounced: false
  })
}

/**
 * Post (or report the existing) announcement for a campaign into the scheduling
 * channel, with an interest button. Mirrors the `/campaign announce` command.
 */
export async function announceCampaign(
  client: Client,
  id: string
): Promise<ServiceResult<AnnounceResult>> {
  const campaign = await getCampaign(id)
  if (!campaign) return fail('Campaign not found.', 404)

  const channel = await getSchedulingChannel(client)
  if (!channel) {
    return fail('No scheduling channel has been set up.', 400)
  }

  if (campaign.announcementMessageId) {
    try {
      const existing = await channel.messages.fetch(
        campaign.announcementMessageId
      )
      if (existing) {
        return ok({
          messageLink: messageLink(channel.id, existing.id),
          alreadyAnnounced: true
        })
      }
    } catch (err) {
      logger.warn(`Could not fetch existing announcement message: ${err}`)
    }
  }

  let players: Player[] = []
  try {
    players = await getPlayersByCampaign(campaign.id)
  } catch (err) {
    logger.error('Error fetching players:', err)
  }

  const embed = createCampaignMessageEmbed(campaign, players)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createCampaignInterestButtonId(campaign.id))
      .setLabel("I'm Interested")
      .setStyle(ButtonStyle.Primary)
  )

  const message = await channel.send({
    content: `<@&${campaign.discordRoleId}>`,
    embeds: [embed],
    components: [actionRow]
  })
  await updateCampaign(campaign.id, { announcementMessageId: message.id })

  return ok({
    messageLink: messageLink(channel.id, message.id),
    alreadyAnnounced: false
  })
}
