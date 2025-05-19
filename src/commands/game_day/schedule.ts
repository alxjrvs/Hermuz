import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalSubmitInteraction,
  MessageFlags,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js'
import { createGameDayMessageEmbed } from '../../utils/gameDayMessageUtils'
import { getGameByRoleId } from '../../models/game'
import { createGameDayDraft, updateGameDay } from '../../models/gameDay'
import { getOrCreateUser } from '../../models/user'
import { createAttendance } from '../../models/attendance'
import {
  getDiscordServerByDiscordId,
  getSchedulingChannel
} from '../../models/discordServer'
import { createGameDayChannels } from '../../utils/channelUtils'
import { createAttendanceButtonId } from '../../utils/buttonUtils'

export const config = createCommandConfig({
  description: 'Schedule a new game day event',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with a game',
      type: 'role',
      required: false
    }
  ]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    // Check if the server has a scheduling channel set
    const server = await getDiscordServerByDiscordId(interaction.guildId!)
    if (!server || !server.scheduling_channel_id) {
      return interaction.reply({
        content:
          'This server does not have a scheduling channel set. Please ask an administrator to use the `/set_scheduling_channel` command to set one up before scheduling game days.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Get the optional role argument
    const role = interaction.options.getRole('role')

    // Set up role info based on the provided role
    let roleInfo: { exists: boolean; id?: string; name?: string } = {
      exists: false
    }

    if (role) {
      roleInfo = {
        exists: true,
        id: role.id,
        name: role.name
      }
    }

    // Create the modal
    const [modalId, modal] = createScheduleModal()

    // Show the modal to the user
    // This counts as a reply to the interaction
    await interaction.showModal(modal)

    try {
      logger.info('Waiting for modal submission...')

      // Wait for the modal submission
      // This is a NEW interaction, separate from the original slash command
      const modalSubmitInteraction = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === modalId,
        time: 300000 // 5 minutes timeout
      })

      logger.info('Modal submitted, processing...')

      // Process the modal submission
      await handleModalSubmit(
        modalSubmitInteraction,
        interaction.user.id,
        interaction.user.username,
        interaction.guildId!,
        roleInfo
      )

      logger.info('Modal processing complete')
    } catch (error) {
      // This will catch timeouts (user didn't submit the modal)
      // We don't need to respond here as the interaction was handled by showModal
      logger.error('Error with modal submission:', error)
      // Do NOT try to reply to the original interaction here - it's already been handled
    }
  } catch (error) {
    logger.error('Error in game_day schedule command:', error)
    // Only reply if we haven't already
    if (!interaction.replied) {
      await interaction.reply({
        content:
          'An error occurred while scheduling the game day. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}

/**
 * Create a modal for scheduling a game day
 */
function createScheduleModal(): [string, ModalBuilder] {
  const modalId = `schedule_modal_${Date.now()}`
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle('Schedule Game Day')

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter a title for the game day')
    .setRequired(true)
    .setMaxLength(100)

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter details about the event')
    .setRequired(true)
    .setMaxLength(1000)

  const dateTimeInput = new TextInputBuilder()
    .setCustomId('date_time')
    .setLabel('Date/Time (YYYY-MM-DD HH:MM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 2023-12-31 19:30')
    .setRequired(true)

  const locationInput = new TextInputBuilder()
    .setCustomId('location')
    .setLabel('Location')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Where the event will take place')
    .setRequired(true)
    .setMaxLength(100)

  // Add inputs to action rows
  const titleActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    titleInput
  )
  const descriptionActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  const dateTimeActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateTimeInput)
  const locationActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(locationInput)

  // Add action rows to the modal
  modal.addComponents(
    titleActionRow,
    descriptionActionRow,
    dateTimeActionRow,
    locationActionRow
  )

  return [modalId, modal]
}

/**
 * Handle the modal submission
 */
async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  userId: string,
  username: string,
  guildId: string,
  roleInfo?: { exists: boolean; id?: string; name?: string }
) {
  try {
    // For modal submissions, we need to acknowledge the interaction first
    // Use deferReply to acknowledge the modal submission
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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

    // Variable to store game information for embeds
    let gameForEmbed = null

    // Get the server record - we already checked that it exists and has a scheduling channel
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply(
        'Failed to retrieve server record. Please try again later.'
      )
    }

    // Handle the game role if provided
    let gameId: string | undefined
    let gameRoleId: string | undefined

    if (roleInfo && roleInfo.exists && roleInfo.id) {
      // Check if this is an existing role associated with a game
      const game = await getGameByRoleId(roleInfo.id)
      if (game) {
        gameId = game.id
        gameRoleId = roleInfo.id
      } else {
        return interaction.editReply(
          'The provided role is not associated with any game. Please use a role that is set up with a game, or leave the role field empty.'
        )
      }
    }

    // Create a new Discord role for this game day
    const gameDayRole = await createGameDayRole(interaction, title, dateTime)
    if (!gameDayRole) {
      return interaction.editReply(
        'Failed to create a role for the game day. Please make sure the bot has the necessary permissions.'
      )
    }

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

    if (channels) {
      logger.info(`Created channels for game day ${gameDay.id}`)

      // Update the game day with the category ID
      await updateGameDay(gameDay.id, {
        discord_category_id: channels.category.id
      })

      // Send a welcome message in the general channel
      await channels.generalChannel.send({
        content: `Welcome to the ${title} game day channels! <@&${gameDayRole.id}>\n\nThis is a private category only visible to people who have RSVP'd as available for this game day. Use these channels to coordinate and discuss the upcoming game day.`
      })
    } else {
      logger.warn(`Failed to create channels for game day ${gameDay.id}`)
      // Continue with the game day creation even if channel creation fails
    }

    // Create an attendance record for the host with AVAILABLE status
    const hostAttendance = await createAttendance({
      game_day_id: gameDay.id,
      user_id: userId,
      status: 'AVAILABLE'
    })

    if (!hostAttendance) {
      logger.warn(
        `Failed to create attendance record for host (${userId}) for game day ${gameDay.id}`
      )
    } else {
      logger.info(
        `Created attendance record for host (${userId}) for game day ${gameDay.id}`
      )
    }

    // Create a success embed for the user using our utility function
    // Use the game we already fetched or fetch it if needed
    if (gameId && !gameForEmbed && gameRoleId) {
      gameForEmbed = await getGameByRoleId(gameRoleId)
    }

    // Create the embed with the host's attendance
    const attendances = hostAttendance ? [hostAttendance] : []
    const userEmbed = createGameDayMessageEmbed(
      gameDay,
      attendances,
      gameForEmbed
    )

    // Send the success message to the user
    await interaction.editReply({ embeds: [userEmbed] })

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

    // Post the announcement to the scheduling channel
    try {
      await schedulingChannel.send({
        content: gameRoleId ? `<@&${gameRoleId}>` : `@everyone`,
        embeds: [announcementEmbed],
        components: [buttonRow]
      })
      logger.info(
        `Posted game day announcement to scheduling channel: ${schedulingChannel.id}`
      )
    } catch (error) {
      logger.error(
        'Error posting game day announcement to scheduling channel:',
        error
      )
      // We don't need to return an error to the user here since the game day was created successfully
    }
  } catch (error) {
    logger.error('Error handling modal submission:', error)

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

/**
 * Parse a date/time string in YYYY-MM-DD HH:MM format
 */
function parseDateTime(dateTimeStr: string): Date | null {
  // Regular expression to match YYYY-MM-DD HH:MM format
  const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
  const match = dateTimeStr.match(regex)

  if (!match) {
    return null
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match

  // Parse components as integers
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 // JavaScript months are 0-indexed
  const day = parseInt(dayStr, 10)
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  // Validate ranges
  if (
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  // Create and return the date
  const date = new Date(year, month, day, hour, minute)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Create a Discord role for a game day
 */
async function createGameDayRole(
  interaction: ModalSubmitInteraction,
  title: string,
  dateTime: Date
): Promise<import('discord.js').Role | null> {
  try {
    // Generate a role name based on the title and date
    const roleName = generateRoleName(title, dateTime)

    // Create the role
    const role = await interaction.guild!.roles.create({
      name: roleName,
      reason: 'Game day event role',
      permissions: PermissionFlagsBits.ViewChannel
    })

    return role
  } catch (error) {
    logger.error('Error creating game day role:', error)
    return null
  }
}

/**
 * Generate a role name based on the title and date
 */
function generateRoleName(title: string, dateTime: Date): string {
  // Take the first 10 characters of the title, removing spaces and special characters
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 10)
    .toLowerCase()

  // Format the date as MM-DD-YY
  const month = (dateTime.getMonth() + 1).toString().padStart(2, '0')
  const day = dateTime.getDate().toString().padStart(2, '0')
  const year = dateTime.getFullYear().toString().substring(2)

  // Combine the parts
  return `gameday-${titlePart}-${month}${day}${year}`
}
