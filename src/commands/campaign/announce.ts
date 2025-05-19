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
    // Get the role option
    const role = interaction.options.getRole('role', true)

    // Defer reply to give us time to process
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    // Get the campaign by role ID
    const campaign = await getCampaignByRoleId(role.id)
    if (!campaign) {
      return interaction.editReply({
        content: `No campaign found associated with the role ${role.name}.`
      })
    }

    // Get the scheduling channel
    const schedulingChannel = await getSchedulingChannel(interaction.guildId!)
    if (!schedulingChannel) {
      return interaction.editReply({
        content:
          'No scheduling channel has been set up. Please use `/set_scheduling_channel` to set one up first.'
      })
    }

    // Get the channel
    const channel = await interaction.guild!.channels.fetch(
      schedulingChannel.id
    )
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply({
        content:
          'The scheduling channel is not available or is not a text channel. Please use `/set_scheduling_channel` to set up a new one.'
      })
    }

    // Check if the campaign has already been announced
    if (campaign.announcement_message_id) {
      try {
        // Try to fetch the existing message
        const existingMessage = await channel.messages.fetch(
          campaign.announcement_message_id
        )

        if (existingMessage) {
          // Create a link to the existing message
          const messageLink = `https://discord.com/channels/${interaction.guildId}/${schedulingChannel.id}/${existingMessage.id}`

          return interaction.editReply({
            content: `Campaign "${campaign.title}" has already been announced. You can view the announcement here: ${messageLink}`
          })
        }
      } catch (error) {
        // If we can't fetch the message, it might have been deleted
        // We'll continue with creating a new announcement
        logger.warn(`Could not fetch existing announcement message: ${error}`)
      }
    }

    // Get players for the campaign
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

    // Create the embed for the campaign
    const embed = createCampaignMessageEmbed(campaign, players)

    // Create the interest button
    const interestedButton = new ButtonBuilder()
      .setCustomId(createCampaignInterestButtonId(campaign.id))
      .setLabel("I'm Interested")
      .setStyle(ButtonStyle.Primary)

    // Add the button to an action row
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      interestedButton
    )

    // Prepare content with mentions
    const content = `<@&${campaign.discord_role_id}>`

    // Send the message to the scheduling channel
    const announcementMessage = await channel.send({
      content: content,
      embeds: [embed],
      components: [actionRow]
    })

    // Update the campaign record with the announcement message ID
    await updateCampaign(campaign.id, {
      announcement_message_id: announcementMessage.id
    })

    // Create a link to the announcement message
    const messageLink = `https://discord.com/channels/${interaction.guildId}/${schedulingChannel.id}/${announcementMessage.id}`

    // Confirm to the user
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
