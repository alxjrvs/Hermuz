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
      content: 'Campaign not found. It may have been deleted.'
    })
  }
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
  const status: PlayerStatus = 'INTERESTED'
  const player = await getOrCreatePlayer(
    interaction.user.id,
    campaignId,
    undefined, 
    status
  )
  if (!player) {
    return interaction.editReply({
      content: 'Failed to update player status. Please try again later.'
    })
  }
  await handleRoleAssignment(interaction, campaign)
  await updateCampaignMessage(interaction, campaign)
  return interaction.editReply({
    content: `You are now interested in the "${campaign.title}" campaign! You have been assigned the campaign role.`
  })
}
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
    }
  }
}
async function updateCampaignMessage(
  interaction: ButtonInteraction,
  campaign: Campaign
) {
  try {
    const players = await getPlayersByCampaign(campaign.id)
    const message = interaction.message
    const updatedEmbed = createCampaignMessageEmbed(campaign, players)
    await message.edit({
      embeds: [updatedEmbed],
      components: message.components 
    })
    logger.info(
      `Updated campaign message with new player for campaign: ${campaign.id}`
    )
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
  if (!interaction.isButton()) return
  try {
    const buttonData = deserializeButtonData(interaction.customId)
    if (!buttonData || !isCampaignInterestButton(buttonData)) {
      return
    }
    const { campaignId } = buttonData
    await processCampaignInterest(interaction, campaignId)
  } catch (error) {
    logger.error('Error handling campaign interest button interaction:', error)
    handleInteractionError(interaction, error)
  }
}
