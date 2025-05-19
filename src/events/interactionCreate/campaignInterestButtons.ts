import { logger } from 'robo.js'
import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { getOrCreateUser } from '../../models/user'
import { getCampaign } from '../../models/campaign'
import { getOrCreatePlayer, getPlayersByCampaign } from '../../models/player'
import { createCampaignMessageEmbed } from '../../utils/campaignMessageUtils'
import {
  deserializeButtonData,
  isCampaignInterestButton
} from '../../utils/buttonUtils'
import { isUUID, isDiscordId } from '../../utils/typeGuards'
import { PlayerStatus } from '../../types/enums'
import { Campaign } from '../../utils/supabase'

/**
 * Process a campaign interest update
 */
async function processCampaignInterest(
  interaction: ButtonInteraction,
  campaignId: string
) {
  // Validate inputs
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

  // Defer the reply to avoid interaction timeout
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  // Get the campaign
  const campaign = await getCampaign(campaignId)
  if (!campaign) {
    return interaction.editReply({
      content: 'Campaign not found. It may have been deleted.'
    })
  }

  // Get or create the user
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username
  )
  if (!user) {
    return interaction.editReply({
      content:
        'Failed to retrieve or create user record. Please try again later.'
    })
  }

  // Get or create the player with INTERESTED status
  const status: PlayerStatus = 'INTERESTED'
  const player = await getOrCreatePlayer(
    interaction.user.id,
    campaignId,
    undefined, // No character name yet
    status
  )

  if (!player) {
    return interaction.editReply({
      content: 'Failed to update player status. Please try again later.'
    })
  }

  // Handle role assignment
  await handleRoleAssignment(interaction, campaign)

  // Update the campaign message
  await updateCampaignMessage(interaction, campaign)

  return interaction.editReply({
    content: `You are now interested in the "${campaign.title}" campaign! You have been assigned the campaign role.`
  })
}

/**
 * Handle role assignment for campaign interest
 */
async function handleRoleAssignment(
  interaction: ButtonInteraction,
  campaign: Campaign
) {
  if (campaign.discord_role_id) {
    try {
      const member = await interaction.guild?.members.fetch(interaction.user.id)
      if (member) {
        await member.roles.add(
          campaign.discord_role_id,
          'User interested in campaign'
        )
        logger.info(
          `Added role ${campaign.discord_role_id} to user ${interaction.user.id} for campaign ${campaign.id}`
        )
      }
    } catch (error) {
      logger.error(
        `Error managing role for user ${interaction.user.id}:`,
        error
      )
      // Continue with the player update even if role management fails
    }
  }
}

/**
 * Update the campaign message with new player information
 */
async function updateCampaignMessage(
  interaction: ButtonInteraction,
  campaign: Campaign
) {
  try {
    // Get the updated player list
    const players = await getPlayersByCampaign(campaign.id)

    // Get the original message
    const message = interaction.message

    // Create updated embed with new player counts
    const updatedEmbed = createCampaignMessageEmbed(campaign, players)

    // Update the original message with the new embed
    await message.edit({
      embeds: [updatedEmbed],
      components: message.components // Keep the same buttons
    })

    logger.info(
      `Updated campaign message with new player for campaign: ${campaign.id}`
    )
  } catch (error) {
    logger.error('Error updating campaign message:', error)
    // Continue to reply to the user even if updating the message fails
  }
}

/**
 * Handle interaction errors
 */
async function handleInteractionError(
  interaction: ButtonInteraction,
  error: unknown
) {
  // Log the error with more context
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Error in campaign interest button interaction: ${errorMessage}`)

  try {
    // Prepare a user-friendly error message
    const userMessage =
      'An error occurred while updating your interest. Please try again later.'

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

export default async (interaction: ButtonInteraction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  try {
    // Deserialize the button data
    const buttonData = deserializeButtonData(interaction.customId)

    // If deserialization failed or this is not a campaign interest button, ignore it
    if (!buttonData || !isCampaignInterestButton(buttonData)) {
      return
    }

    // Extract data from the button
    const { campaignId } = buttonData

    // Process the campaign interest update
    await processCampaignInterest(interaction, campaignId)
  } catch (error) {
    logger.error('Error handling campaign interest button interaction:', error)
    handleInteractionError(interaction, error)
  }
}
