import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js'
import { getCampaignByRoleId, updateCampaign } from '../../models/campaign'
import { getSchedulingChannel } from '../../models/discordServer'
import { createCampaignMessageEmbed } from '../../utils/campaignMessageUtils'
import { createCampaignInterestButtonId } from '../../utils/buttonUtils'
import { Player, supabase } from '../../utils/supabase'
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
} as const)
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
    const schedulingChannel = await getSchedulingChannel(interaction.guildId!)
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
    if (campaign.announcement_message_id) {
      try {
        const existingMessage = await channel.messages.fetch(
          campaign.announcement_message_id
        )
        if (existingMessage) {
          const messageLink = `https:
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
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('campaign_id', campaign.id)
      if (data) {
        players = data
      }
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
    const content = `<@&${campaign.discord_role_id}>`
    const announcementMessage = await channel.send({
      content: content,
      embeds: [embed],
      components: [actionRow]
    })
    await updateCampaign(campaign.id, {
      announcement_message_id: announcementMessage.id
    })
    const messageLink = `https:
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
