import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js'
import {
  type Player,
  getCampaignByRoleId,
  updateCampaign,
  getPlayersByCampaign
} from '@hermuz/db'
import { getSchedulingChannel } from '~/utils/schedulingChannel'
import { createCampaignMessageEmbed } from '../../utils/campaignMessageUtils'
import { createCampaignInterestButtonId } from '../../utils/buttonUtils'
export const config = createCommandConfig({
  description: 'Announce an existing campaign in the scheduling channel',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with the campaign',
      type: 'role',
      required: true
    }
  ]
})
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    const role = interaction.options.getRole('role', true)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const campaign = await getCampaignByRoleId(role.id)
    if (!campaign) {
      return interaction.editReply({
        content: `No campaign found associated with the role ${role.name}.`
      })
    }
    const schedulingChannel = await getSchedulingChannel(interaction.client)
    if (!schedulingChannel) {
      return interaction.editReply({
        content:
          'No scheduling channel has been set up. Please use `/set_scheduling_channel` to set one up first.'
      })
    }
    const channel = await interaction.guild!.channels.fetch(
      schedulingChannel.id
    )
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply({
        content:
          'The scheduling channel is not available or is not a text channel. Please use `/set_scheduling_channel` to set up a new one.'
      })
    }
    if (campaign.announcementMessageId) {
      try {
        const existingMessage = await channel.messages.fetch(
          campaign.announcementMessageId
        )
        if (existingMessage) {
          const messageLink = `https://discordapp.com/channels/${interaction.guildId}/${channel.id}/${existingMessage.id}`
          return interaction.editReply({
            content: `Campaign "${campaign.title}" has already been announced. You can view the announcement here: ${messageLink}`
          })
        }
      } catch (error) {
        logger.warn(`Could not fetch existing announcement message: ${error}`)
      }
    }
    let players: Player[] = []
    try {
      players = await getPlayersByCampaign(campaign.id)
    } catch (error) {
      logger.error('Error fetching players:', error)
    }
    const embed = createCampaignMessageEmbed(campaign, players)
    const interestedButton = new ButtonBuilder()
      .setCustomId(createCampaignInterestButtonId(campaign.id))
      .setLabel("I'm Interested")
      .setStyle(ButtonStyle.Primary)
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      interestedButton
    )
    const content = `<@&${campaign.discordRoleId}>`
    const announcementMessage = await channel.send({
      content: content,
      embeds: [embed],
      components: [actionRow]
    })
    await updateCampaign(campaign.id, {
      announcementMessageId: announcementMessage.id
    })
    const messageLink = `https://discordapp.com/channels/${interaction.guildId}/${channel.id}/${announcementMessage.id}`
    return interaction.editReply({
      content: `Campaign "${campaign.title}" has been announced in the scheduling channel. You can view the announcement here: ${messageLink}`
    })
  } catch (error) {
    logger.error('Error in campaign announce command:', error)
    return interaction.reply({
      content: 'An error occurred while processing your command.',
      flags: MessageFlags.Ephemeral
    })
  }
}
