import {
  deletePlayerByUserAndCampaign,
  getCampaign,
  getOrCreatePlayer,
  getOrCreateUser,
  getPlayerByUserAndCampaign,
  getPlayersByCampaign,
  type Player,
  type PlayerStatus,
  updatePlayerByUserAndCampaign,
  updatePlayerStatusByUserAndCampaign
} from '@hermuz/db'
import type { Client } from 'discord.js'
import { config } from '~/config'
import { createCampaignMessageEmbed } from '~/utils/campaignMessageUtils'
import { logger } from '~/utils/logger'
import { handleCampaignRoleAssignment } from '~/utils/roleUtils'
import { getSchedulingChannel } from '~/utils/schedulingChannel'
import { fail, ok, type ServiceResult } from './result'

/**
 * Campaign membership as self-service, shared by the "I'm Interested" button,
 * the `/campaign join|leave|confirm` and `/character set` commands, and the web
 * endpoints. Each op syncs the campaign role and refreshes the announcement.
 */

export async function joinCampaign(
  client: Client,
  campaignId: string,
  userId: string,
  username: string,
  status: PlayerStatus = 'INTERESTED'
): Promise<ServiceResult<Player>> {
  const campaign = await getCampaign(campaignId)
  if (!campaign) return fail('Campaign not found.', 404)

  await getOrCreateUser(userId, username)
  const player = await getOrCreatePlayer(userId, campaignId, undefined, status)
  if (!player) return fail('Failed to join the campaign.', 500)

  await syncCampaignRole(client, campaignId, userId)
  await refreshCampaignAnnouncement(client, campaignId)
  return ok(player)
}

export async function leaveCampaign(
  client: Client,
  campaignId: string,
  userId: string
): Promise<ServiceResult<{ left: true }>> {
  const campaign = await getCampaign(campaignId)
  if (!campaign) return fail('Campaign not found.', 404)

  const removed = await deletePlayerByUserAndCampaign(userId, campaignId)
  if (!removed) return fail('Failed to leave the campaign.', 500)

  // Best-effort role removal.
  try {
    if (campaign.discordRoleId) {
      const guild = await client.guilds.fetch(config.guildId)
      const member = await guild.members.fetch(userId)
      await member.roles.remove(campaign.discordRoleId, 'Left campaign')
    }
  } catch (err) {
    logger.error(`Role removal failed leaving campaign (user ${userId}):`, err)
  }
  await refreshCampaignAnnouncement(client, campaignId)
  return ok({ left: true })
}

export async function setPlayerStatus(
  client: Client,
  campaignId: string,
  userId: string,
  status: PlayerStatus
): Promise<ServiceResult<Player>> {
  const existing = await getPlayerByUserAndCampaign(userId, campaignId)
  if (!existing) return fail('You are not a member of this campaign.', 404)

  const player = await updatePlayerStatusByUserAndCampaign(
    userId,
    campaignId,
    status
  )
  if (!player) return fail('Failed to update your status.', 500)
  await refreshCampaignAnnouncement(client, campaignId)
  return ok(player)
}

export async function setCharacterName(
  _client: Client,
  campaignId: string,
  userId: string,
  characterName: string
): Promise<ServiceResult<Player>> {
  const existing = await getPlayerByUserAndCampaign(userId, campaignId)
  if (!existing) return fail('You are not a member of this campaign.', 404)

  const player = await updatePlayerByUserAndCampaign(userId, campaignId, {
    characterName
  })
  if (!player) return fail('Failed to set your character name.', 500)
  return ok(player)
}

async function syncCampaignRole(
  client: Client,
  campaignId: string,
  userId: string
): Promise<void> {
  try {
    const campaign = await getCampaign(campaignId)
    if (!campaign) return
    const guild = await client.guilds.fetch(config.guildId)
    const member = await guild.members.fetch(userId)
    if (member) await handleCampaignRoleAssignment(member, campaign)
  } catch (err) {
    logger.error(`Campaign role sync failed (user ${userId}):`, err)
  }
}

/** Re-render a campaign's announcement embed in place, if it was announced. */
export async function refreshCampaignAnnouncement(
  client: Client,
  campaignId: string
): Promise<void> {
  try {
    const campaign = await getCampaign(campaignId)
    if (!campaign?.announcementMessageId) return
    const channel = await getSchedulingChannel(client)
    if (!channel) return
    const message = await channel.messages.fetch(campaign.announcementMessageId)
    if (!message) return
    const players = await getPlayersByCampaign(campaignId)
    await message.edit({
      embeds: [createCampaignMessageEmbed(campaign, players)]
    })
  } catch (err) {
    logger.error('Error refreshing campaign announcement:', err)
  }
}
