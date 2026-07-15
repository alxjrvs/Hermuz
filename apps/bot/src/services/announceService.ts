import {
  type Client,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js'
import {
  type Attendance,
  type Player,
  getGameDay,
  getGame,
  getGameDayAttendances,
  updateGameDay,
  getCampaign,
  getPlayersByCampaign,
  updateCampaign
} from '@hermuz/db'
import { getSchedulingChannel } from '~/utils/schedulingChannel'
import { createGameDayMessageEmbed } from '~/utils/gameDayMessageUtils'
import { createCampaignMessageEmbed } from '~/utils/campaignMessageUtils'
import {
  createAttendanceButtonId,
  createCampaignInterestButtonId
} from '~/utils/buttonUtils'
import { config } from '~/config'
import { logger } from '~/utils/logger'
import { ok, fail, type ServiceResult } from './result'

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
