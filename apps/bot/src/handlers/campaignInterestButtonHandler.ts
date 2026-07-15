import { logger } from '~/utils/logger'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getCampaign } from '@hermuz/db'
import { ButtonData, isCampaignInterestButton } from '../utils/buttonUtils'
import { isUUID, isDiscordId } from '../utils/typeGuards'
import { PlayerStatus } from '../types/enums'
import { ButtonHandler } from '../utils/buttonRegistry'
import {
  generateCampaignInterestStatusMessage,
  generateCampaignInterestErrorMessage
} from '../utils/messageUtils'
import { joinCampaign } from '~/services/playerService'

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

  // Delegates to the shared player service — same path as `/campaign join` and
  // the web endpoint (join as INTERESTED, sync role, refresh announcement).
  const status: PlayerStatus = 'INTERESTED'
  const result = await joinCampaign(
    interaction.client,
    campaignId,
    interaction.user.id,
    interaction.user.username,
    status
  )
  if (!result.ok) {
    return interaction.editReply({
      content: generateCampaignInterestErrorMessage('player_error')
    })
  }

  const campaign = await getCampaign(campaignId)
  return interaction.editReply({
    content: campaign
      ? generateCampaignInterestStatusMessage(status, campaign)
      : 'You are now interested in this campaign.'
  })
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
