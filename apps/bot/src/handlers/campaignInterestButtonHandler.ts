import { logger } from 'robo.js'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getOrCreateUser } from '../models/user'
import { getCampaign } from '../models/campaign'
import { getOrCreatePlayer, getPlayersByCampaign } from '../models/player'
import { getSchedulingChannel } from '../models/discordServer'
import { createCampaignMessageEmbed } from '../utils/campaignMessageUtils'
import { ButtonData, isCampaignInterestButton } from '../utils/buttonUtils'
import { isUUID, isDiscordId } from '../utils/typeGuards'
import { PlayerStatus } from '../types/enums'
import { Campaign } from '../utils/supabase'
import { ButtonHandler } from '../utils/buttonRegistry'
import {
  generateCampaignInterestStatusMessage,
  generateCampaignInterestErrorMessage
} from '../utils/messageUtils'
import { handleCampaignRoleAssignment } from '../utils/roleUtils'

async function processCampaignInterest(
  interaction: ButtonInteraction,
  campaignId: string
) {
  if (!isUUID(campaignId)) {
    logger.error(
      `Invalid campaign ID in processCampaignInterest: ${campaignId}`
    )
    return
  }

  if (!isDiscordId(interaction.user.id)) {
    logger.error(`Invalid Discord user ID: ${interaction.user.id}`)
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const campaign = await getCampaign(campaignId)
  if (!campaign) {
    return interaction.editReply({
      content: generateCampaignInterestErrorMessage('not_found')
    })
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username
  )

  if (!user) {
    return interaction.editReply({
      content: generateCampaignInterestErrorMessage('user_error')
    })
  }

  const status: PlayerStatus = 'INTERESTED'
  const player = await getOrCreatePlayer(
    interaction.user.id,
    campaignId,
    undefined,
    status
  )

  if (!player) {
    return interaction.editReply({
      content: generateCampaignInterestErrorMessage('player_error')
    })
  }

  await handleRoleAssignment(interaction, campaign)
  await updateCampaignMessage(interaction, campaign)

  return interaction.editReply({
    content: generateCampaignInterestStatusMessage(status, campaign)
  })
}

async function handleRoleAssignment(
  interaction: ButtonInteraction,
  campaign: Campaign
) {
  try {
    const member = await interaction.guild?.members.fetch(interaction.user.id)
    if (member) {
      await handleCampaignRoleAssignment(member, campaign)
    }
  } catch (error) {
    logger.error(
      `Error fetching member for role assignment: ${interaction.user.id}`,
      error
    )
  }
}

async function updateCampaignMessage(
  interaction: ButtonInteraction,
  campaign: Campaign
) {
  try {
    if (!campaign.announcement_message_id) {
      return
    }

    // Get the scheduling channel from the guild
    const schedulingChannel = await getSchedulingChannel(interaction.guildId!)
    if (!schedulingChannel) {
      return
    }

    const channel = await interaction.guild?.channels.fetch(
      schedulingChannel.id
    )

    if (!channel?.isTextBased()) {
      return
    }

    const message = await channel.messages.fetch(
      campaign.announcement_message_id
    )
    if (!message) {
      return
    }

    const players = await getPlayersByCampaign(campaign.id)
    const embed = createCampaignMessageEmbed(campaign, players)

    await message.edit({
      embeds: [embed]
    })
  } catch (error) {
    logger.error('Error updating campaign message:', error)
  }
}

async function handleInteractionError(
  interaction: ButtonInteraction,
  error: unknown
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Error in campaign interest button interaction: ${errorMessage}`)

  try {
    const userMessage = generateCampaignInterestErrorMessage('generic')

    if (interaction.deferred) {
      await interaction.editReply({
        content: userMessage
      })
    } else {
      await interaction.reply({
        content: userMessage,
        flags: MessageFlags.Ephemeral
      })
    }
  } catch (replyError) {
    logger.error('Error replying to interaction:', replyError)
  }
}

export const campaignInterestButtonHandler: ButtonHandler = {
  canHandle: (data: ButtonData) => isCampaignInterestButton(data),
  handle: async (interaction: ButtonInteraction, data: ButtonData) => {
    try {
      if (isCampaignInterestButton(data)) {
        const { campaignId } = data
        await processCampaignInterest(interaction, campaignId)
      }
    } catch (error) {
      logger.error(
        'Error handling campaign interest button interaction:',
        error
      )
      await handleInteractionError(interaction, error)
    }
  }
}
