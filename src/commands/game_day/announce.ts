import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js'
import { getGameDayByRoleId, updateGameDay } from '../../models/gameDay'
import { getSchedulingChannel } from '../../models/discordServer'
import { createGameDayMessageEmbed } from '../../utils/gameDayMessageUtils'
import { createAttendanceButtonId } from '../../utils/buttonUtils'
import { Attendance, supabase } from '../../utils/supabase'

export const config = createCommandConfig({
  description: 'Announce an existing game day in the scheduling channel',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with the game day',
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

    // Get the game day by role ID
    const gameDay = await getGameDayByRoleId(role.id)
    if (!gameDay) {
      return interaction.editReply({
        content: `No game day found associated with the role ${role.name}.`
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

    // Check if the game day has already been announced
    if (gameDay.announcement_message_id) {
      try {
        // Try to fetch the existing message
        const existingMessage = await channel.messages.fetch(
          gameDay.announcement_message_id
        )

        if (existingMessage) {
          // Create a link to the existing message
          const messageLink = `https://discord.com/channels/${interaction.guildId}/${schedulingChannel.id}/${existingMessage.id}`

          return interaction.editReply({
            content: `Game day "${gameDay.title}" has already been announced. You can view the announcement here: ${messageLink}`
          })
        }
      } catch (error) {
        // If we can't fetch the message, it might have been deleted
        // We'll continue with creating a new announcement
        logger.warn(`Could not fetch existing announcement message: ${error}`)
      }
    }

    // Get the game if it exists
    let gameForEmbed = null
    if (gameDay.game_id) {
      try {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameDay.game_id)
          .single()

        if (data) {
          gameForEmbed = data
        }
      } catch (error) {
        logger.error('Error fetching game for embed:', error)
      }
    }

    // Get attendances for the game day
    let attendances: Attendance[] = []
    try {
      const { data } = await supabase
        .from('attendances')
        .select('*')
        .eq('game_day_id', gameDay.id)

      if (data) {
        attendances = data
      }
    } catch (error) {
      logger.error('Error fetching attendances:', error)
    }

    // Create the embed for the game day
    const embed = createGameDayMessageEmbed(gameDay, attendances, gameForEmbed)

    // Create the attendance buttons
    const availableButton = new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('AVAILABLE', gameDay.id))
      .setLabel("I'm in")
      .setStyle(ButtonStyle.Success)

    const interestedButton = new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('INTERESTED', gameDay.id))
      .setLabel("I'm Interested")
      .setStyle(ButtonStyle.Primary)

    const notAvailableButton = new ButtonBuilder()
      .setCustomId(createAttendanceButtonId('NOT_AVAILABLE', gameDay.id))
      .setLabel('Not Available')
      .setStyle(ButtonStyle.Secondary)

    // Add the buttons to an action row
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      availableButton,
      interestedButton,
      notAvailableButton
    )

    // Prepare content with mentions and event link if available
    let content = gameForEmbed?.discord_role_id
      ? `<@&${gameForEmbed.discord_role_id}>`
      : `@everyone`

    // Add link to Discord event if it was created
    if (gameDay.discord_event_id) {
      content += `\n\nJoin the Discord event: https://discord.com/events/${interaction.guildId}/${gameDay.discord_event_id}`
    }

    // Send the message to the scheduling channel
    const announcementMessage = await channel.send({
      content: content,
      embeds: [embed],
      components: [actionRow]
    })

    // Update the game day record with the announcement message ID
    await updateGameDay(gameDay.id, {
      announcement_message_id: announcementMessage.id
    })

    // If we have both the event ID and the announcement message, update the event description to include the message link
    if (gameDay.discord_event_id && announcementMessage) {
      try {
        const guild = interaction.guild!
        const event = await guild.scheduledEvents.fetch(
          gameDay.discord_event_id
        )

        // Update the event description to include a link to the announcement message
        const messageLink = `https://discord.com/channels/${interaction.guildId}/${schedulingChannel.id}/${announcementMessage.id}`
        const updatedDescription = `${gameDay.description || `Game day for ${gameDay.title}`}\n\nRSVP and discussion: ${messageLink}`

        await event.edit({
          description: updatedDescription
        })

        logger.info(`Updated event description with announcement message link`)
      } catch (error) {
        logger.error(
          'Error updating event description with message link:',
          error
        )
      }
    }

    // Create a link to the announcement message
    const messageLink = `https://discord.com/channels/${interaction.guildId}/${schedulingChannel.id}/${announcementMessage.id}`

    // Confirm to the user
    return interaction.editReply({
      content: `Game day "${gameDay.title}" has been announced in the scheduling channel. You can view the announcement here: ${messageLink}`
    })
  } catch (error) {
    logger.error('Error in game day announce command:', error)
    return interaction.reply({
      content: 'An error occurred while processing your command.',
      flags: MessageFlags.Ephemeral
    })
  }
}
