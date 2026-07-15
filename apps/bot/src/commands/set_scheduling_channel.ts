import { setSchedulingChannelId } from '@hermuz/db'
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
export const config = createCommandConfig({
  description: 'Set the channel for game day scheduling',
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: 'channel',
      description: 'The channel to use for game day scheduling',
      type: 'channel',
      required: true,
      channelTypes: [ChannelType.GuildText]
    }
  ]
})
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const schedulingChannel = interaction.options.getChannel('channel', true)
    if (schedulingChannel.type !== ChannelType.GuildText) {
      return interaction.editReply(
        'The scheduling channel must be a text channel.'
      )
    }
    const success = await setSchedulingChannelId(schedulingChannel.id)
    if (!success) {
      return interaction.editReply(
        'Failed to update server settings. Please try again later.'
      )
    }
    interaction.editReply(
      `Channel set successfully! <#${schedulingChannel.id}> will now be used for game day scheduling.`
    )
  } catch (error) {
    logger.error('Error in set_scheduling_channel command:', error)
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        'An error occurred while setting up the scheduling channel. Please try again later.'
      )
    } else {
      await interaction.reply({
        content:
          'An error occurred while setting up the scheduling channel. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
