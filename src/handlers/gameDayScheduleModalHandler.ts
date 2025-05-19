import { logger } from 'robo.js'
import {
  MessageFlags,
  type ModalSubmitInteraction,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} from 'discord.js'
import {
  EventError,
  getUserFriendlyEventErrorMessage
} from '../utils/eventUtils'
import { createGameDayMessageEmbed } from '../utils/gameDayMessageUtils'
import { getGameByRoleId } from '../models/game'
import { createGameDayDraft, updateGameDay } from '../models/gameDay'
import { getOrCreateUser } from '../models/user'
import { createAttendance } from '../models/attendance'
// These imports are not used in this file but may be needed in the future
// import { getSchedulingChannel, getDiscordServerByDiscordId } from '../models/discordServer'
import { createGameDayChannels } from '../utils/channelUtils'
import { GameDayScheduleModalData } from '../utils/modalUtils'
// This import is not used in this file but may be needed in the future
// import { createAttendanceButtonId } from '../utils/buttonUtils'
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

    const { userId, username, roleInfo } = modalData

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
    let gameForEmbed = null

    if (roleInfo?.exists && roleInfo.id) {
      // If a role was provided, try to find the associated game
      const game = await getGameByRoleId(roleInfo.id)
      if (game) {
        gameId = game.id
        // We don't need to use the game's role ID here as we're creating a new role for the game day
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
        discord_event_id: scheduledEvent.id,
        discord_category_id: channels?.category.id
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

    // Add information about the new announce command
    if (replyContent) {
      replyContent += '\n\n'
    }
    replyContent += `Game day created successfully! Use \`/game_day announce @${gameDayRole.name}\` to announce it in the scheduling channel.`

    // Send the success message to the user
    await interaction.editReply({
      content: replyContent || undefined,
      embeds: [userEmbed]
    })

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
