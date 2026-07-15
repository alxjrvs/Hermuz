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
    const role = interaction.options.getRole('role', true)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const gameDay = await getGameDayByRoleId(role.id)
    if (!gameDay) {
      return interaction.editReply({
        content: `No game day found associated with the role ${role.name}.`
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
    if (gameDay.announcement_message_id) {
      try {
        const existingMessage = await channel.messages.fetch(
          gameDay.announcement_message_id
        )
        if (existingMessage) {
          const messageLink = `https://discordapp.com/channels/${interaction.guildId}/${channel.id}/${existingMessage.id}`
          return interaction.editReply({
            content: `Game day "${gameDay.title}" has already been announced. You can view the announcement here: ${messageLink}`
          })
        }
      } catch (error) {
        logger.warn(`Could not fetch existing announcement message: ${error}`)
      }
    }
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
    const embed = createGameDayMessageEmbed(gameDay, attendances, gameForEmbed)
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
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      availableButton,
      interestedButton,
      notAvailableButton
    )
    let content = gameForEmbed?.discord_role_id
      ? `<@&${gameForEmbed.discord_role_id}>`
      : `@everyone`
    if (gameDay.discord_event_id) {
      content += `\n\nJoin the Discord event: https://discord.com/events/${interaction.guildId}/${gameDay.discord_event_id}`
    }
    const announcementMessage = await channel.send({
      content: content,
      embeds: [embed],
      components: [actionRow]
    })
    await updateGameDay(gameDay.id, {
      announcement_message_id: announcementMessage.id
    })
    if (gameDay.discord_event_id && announcementMessage) {
      try {
        const guild = interaction.guild!
        const event = await guild.scheduledEvents.fetch(
          gameDay.discord_event_id
        )
        const messageLink = `https://discordapp.com/channels/${interaction.guildId}/${channel.id}/${announcementMessage.id}`
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
    const messageLink = `https://discordapp.com/channels/${interaction.guildId}/${channel.id}/${announcementMessage.id}`
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
