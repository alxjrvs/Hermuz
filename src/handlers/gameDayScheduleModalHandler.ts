import { logger } from 'robo.js'
import {
  MessageFlags,
  type ModalSubmitInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} from 'discord.js'
import {
  EventError,
  getUserFriendlyEventErrorMessage
} from '../utils/eventUtils'
import { createGameDayMessageEmbed } from '../utils/gameDayMessageUtils'
import { getGameByRoleId } from '../models/game'
import {
  createGameDayDraft,
  updateGameDay,
  getGameDay
} from '../models/gameDay'
import { getOrCreateUser } from '../models/user'
import { createAttendance } from '../models/attendance'
import {
  getSchedulingChannel,
  getDiscordServerByDiscordId
} from '../models/discordServer'
import { createGameDayChannels } from '../utils/channelUtils'
import { GameDayScheduleModalData } from '../utils/modalUtils'
import { createAttendanceButtonId } from '../utils/buttonUtils'
import { parseDateTime, createGameDayRole } from '../utils/gameDayUtils'

/**
 * Handle the game day schedule modal submission
 *
 * @param interaction The modal submission interaction
 * @param modalData The deserialized modal data
 */
export async function handleGameDayScheduleModalSubmit(
  interaction: ModalSubmitInteraction,
  modalData: GameDayScheduleModalData
) {
  try {
    // For modal submissions, we need to acknowledge the interaction first
    // Use deferReply to acknowledge the modal submission
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const { userId, username, guildId, roleInfo } = modalData

    // Extract values from the modal
    const title = interaction.fields.getTextInputValue('title')
    const description = interaction.fields.getTextInputValue('description')
    const dateTimeStr = interaction.fields.getTextInputValue('date_time')
    const location = interaction.fields.getTextInputValue('location')

    // Validate the date/time format
    const dateTime = parseDateTime(dateTimeStr)
    if (!dateTime) {
      return interaction.editReply(
        'Invalid date/time format. Please use YYYY-MM-DD HH:MM format.'
      )
    }

    // Check if the date is in the future
    if (dateTime <= new Date()) {
      return interaction.editReply(
        'The game day must be scheduled for a future date and time.'
      )
    }

    // Get or create the user
    const user = await getOrCreateUser(userId, username)
    if (!user) {
      return interaction.editReply(
        'Failed to retrieve or create user record. Please try again later.'
      )
    }

    // Set up game information
    let gameId: string | undefined
    let gameRoleId: string | undefined
    let gameForEmbed = null

    if (roleInfo?.exists && roleInfo.id) {
      // If a role was provided, try to find the associated game
      const game = await getGameByRoleId(roleInfo.id)
      if (game) {
        gameId = game.id
        gameRoleId = game.discord_role_id
        gameForEmbed = game
      }
    }

    // Create a role for the game day
    const gameDayRole = await createGameDayRole(
      interaction.guild!,
      title,
      dateTime
    )

    // Create the game day
    const gameDay = await createGameDayDraft({
      title,
      description,
      date_time: dateTime.toISOString(),
      location,
      host_user_id: userId,
      game_id: gameId,
      discord_role_id: gameDayRole.id
    })

    if (!gameDay) {
      // If game day creation failed, try to clean up the role we created
      try {
        await gameDayRole.delete('Game day creation failed')
      } catch (error) {
        logger.error(
          'Error deleting role after game day creation failed:',
          error
        )
      }

      return interaction.editReply(
        'Failed to create the game day. Please try again later.'
      )
    }

    // Create private category and channels for the game day
    const channels = await createGameDayChannels(
      interaction.guild!,
      title,
      gameDayRole
    )

    if (!channels) {
      logger.error('Failed to create channels for game day')
      // Continue with the game day creation even if channel creation fails
    } else {
      logger.info(`Created channels for game day: ${gameDay.id}`)
    }

    // Create a Discord scheduled event
    let scheduledEvent = null
    let eventErrorMessage = ''

    try {
      const guild = interaction.guild!

      // Create the scheduled event
      scheduledEvent = await guild.scheduledEvents.create({
        name: title,
        description: description || `Game day for ${title}`,
        scheduledStartTime: dateTime,
        scheduledEndTime: new Date(dateTime.getTime() + 4 * 60 * 60 * 1000), // Add 4 hours to start time
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: location || 'TBD'
        }
      })

      logger.info(`Created Discord scheduled event: ${scheduledEvent.id}`)

      // Update the game day record with the event ID
      await updateGameDay(gameDay.id, {
        discord_event_id: scheduledEvent.id
      })

      logger.info(`Updated game day with event ID: ${scheduledEvent.id}`)
    } catch (error) {
      if (error instanceof EventError) {
        eventErrorMessage = getUserFriendlyEventErrorMessage(error)
        logger.error(
          `Event error for game day ${gameDay.id}: ${error.message}`,
          error.originalError
        )
      } else {
        logger.error('Error creating Discord scheduled event:', error)

        // Try to determine the specific error
        if (error instanceof Error) {
          if (error.message.includes('Missing Permissions')) {
            eventErrorMessage =
              'The bot does not have permission to create scheduled events. Please ensure the bot has the "Manage Events" permission.'
          } else if (error.message.includes('Invalid Form Body')) {
            eventErrorMessage =
              'Invalid event data provided. Please check the event details.'
          } else {
            eventErrorMessage =
              'An unknown error occurred while creating the Discord scheduled event.'
          }
        } else {
          eventErrorMessage =
            'An unknown error occurred while creating the Discord scheduled event.'
        }
      }

      // Log the error message that will be shown to the user
      logger.warn(
        `Event error message for game day ${gameDay.id}: ${eventErrorMessage}`
      )

      // Continue with the game day creation even if event creation fails
    }

    // Mark the host as available by default
    const hostAttendance = await createAttendance({
      game_day_id: gameDay.id,
      user_id: userId,
      status: 'AVAILABLE'
    })

    if (hostAttendance) {
      // Assign the game day role to the host
      try {
        const member = await interaction.guild!.members.fetch(userId)
        await member.roles.add(
          gameDayRole.id,
          'Host automatically marked as available'
        )
      } catch (error) {
        logger.error('Error assigning role to host:', error)
        // Continue even if role assignment fails
      }
    }

    // Create the embed with the host's attendance
    const attendances = hostAttendance ? [hostAttendance] : []
    const userEmbed = createGameDayMessageEmbed(
      gameDay,
      attendances,
      gameForEmbed
    )

    // Prepare the reply content
    let replyContent = ''

    // Add information about any event creation errors
    if (eventErrorMessage) {
      replyContent = `Game day created successfully, but there was an issue creating the Discord scheduled event: ${eventErrorMessage}`
    }

    // Send the success message to the user
    await interaction.editReply({
      content: replyContent || undefined,
      embeds: [userEmbed]
    })

    // Get the scheduling channel
    const schedulingChannel = await getSchedulingChannel(guildId)
    if (!schedulingChannel) {
      logger.error('Failed to get scheduling channel for announcement')
      return
    }

    // Get the game if it exists
    if (gameId && gameRoleId) {
      gameForEmbed = await getGameByRoleId(gameRoleId)
    }

    // Create an embed for the scheduling channel announcement using our utility function
    // Include the host's attendance in the announcement
    const announcementEmbed = createGameDayMessageEmbed(
      gameDay,
      attendances, // Use the same attendances array we created earlier
      gameForEmbed
    )

    // Create attendance buttons using our utility function
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

    // Create a row of buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      availableButton,
      interestedButton,
      notAvailableButton
    )

    // Get the updated game day with the event ID
    const updatedGameDay = await getGameDay(gameDay.id)

    // Prepare content with mentions and event link if available
    let content = gameRoleId ? `<@&${gameRoleId}>` : `@everyone`

    // Add link to Discord event if it was created
    if (updatedGameDay?.discord_event_id) {
      content += `\n\nJoin the Discord event: https://discord.com/events/${guildId}/${updatedGameDay.discord_event_id}`
    }

    // Send the announcement to the scheduling channel
    const announcementMessage = await schedulingChannel.send({
      content: content,
      embeds: [announcementEmbed],
      components: [buttonRow]
    })

    // If we have both the event ID and the announcement message, update the event description to include the message link
    if (updatedGameDay?.discord_event_id && announcementMessage) {
      try {
        const guild = interaction.guild!
        const event = await guild.scheduledEvents.fetch(
          updatedGameDay.discord_event_id
        )

        // Update the event description to include a link to the announcement message
        const messageLink = `https://discord.com/channels/${guildId}/${schedulingChannel.id}/${announcementMessage.id}`
        const updatedDescription = `${description || `Game day for ${title}`}\n\nRSVP and discussion: ${messageLink}`

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

    logger.info(`Game day scheduled: ${gameDay.id}`)
  } catch (error) {
    logger.error('Error handling game day schedule modal submission:', error)

    try {
      if (interaction.deferred) {
        await interaction.editReply(
          'An error occurred while processing your submission. Please try again later.'
        )
      } else {
        await interaction.reply({
          content:
            'An error occurred while processing your submission. Please try again later.',
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (replyError) {
      // If we can't reply, just log the error
      logger.error('Error replying to interaction:', replyError)
    }
  }
}
