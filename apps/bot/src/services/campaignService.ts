import {
  type Campaign,
  createCampaign,
  getGame,
  updateCampaign
} from '@hermuz/db'
import { type Guild, PermissionFlagsBits } from 'discord.js'
import { generateCampaignRoleName } from '~/utils/campaignUtils'
import { createCampaignChannels } from '~/utils/channelUtils'
import { logger } from '~/utils/logger'
import { fail, ok, type ServiceResult } from './result'

export interface CreateCampaignInput {
  title: string
  description?: string | null
  regularGameTime: string
  /** Associated game by id, or a free-text game name. */
  gameId?: string | null
  gameName?: string | null
  /** Source string for the campaign role name; defaults to the title. */
  roleName?: string | null
}

/**
 * Create a campaign with its Discord role and private category/channels.
 * Mirrors `campaignCreateModalHandler`.
 */
export async function createCampaignWithDiscord(
  guild: Guild,
  input: CreateCampaignInput
): Promise<ServiceResult<Campaign>> {
  let gameId: string | null = null
  let gameName: string | null = input.gameName ?? null
  if (input.gameId) {
    const game = await getGame(input.gameId)
    if (game) gameId = game.id
    else gameName = gameName ?? input.gameId
  }

  const roleName = generateCampaignRoleName(input.roleName ?? input.title)
  const role = await guild.roles.create({
    name: roleName,
    reason: `Campaign role for ${input.title}`,
    permissions: [PermissionFlagsBits.ViewChannel]
  })

  const campaign = await createCampaign({
    title: input.title,
    description: input.description ?? null,
    gameId,
    gameName,
    regularGameTime: input.regularGameTime,
    discordRoleId: role.id
  })
  if (!campaign) {
    try {
      await role.delete('Campaign creation failed')
    } catch (err) {
      logger.error(
        'Error cleaning up role after campaign creation failed:',
        err
      )
    }
    return fail('Failed to create the campaign.', 500)
  }

  const channels = await createCampaignChannels(
    guild,
    `Campaign: ${input.title}`,
    role
  )
  if (!channels) {
    logger.warn(`Campaign ${campaign.id} created but channel creation failed.`)
  } else {
    // Persist the general channel so REPEATING campaigns post day-of reminders there.
    const updated = await updateCampaign(campaign.id, {
      discordChannelId: channels.generalChannel.id
    })
    if (updated) return ok(updated)
  }

  return ok(campaign)
}
