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
  PermissionFlagsBits
} from 'discord.js'
import { getGameByRoleId } from '../models/game'
import { createGameDayDraft } from '../models/gameDay'
import { getOrCreateUser } from '../models/user'
import { getDiscordServerByDiscordId } from '../models/discordServer'

export const config = createCommandConfig({
  description: 'Schedule a new game day event',
  options: [
    {
      name: 'role',
      description:
        'The Discord role associated with a game (existing role or new role name)',
      type: 'string',
      required: true
    }
  ]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    // Get the optional role argument (could be an existing role or a new role name)
    const roleInput = interaction.options.getString('role')

    // If a role was provided, check if it matches an existing role
    let roleInfo: { exists: boolean; id?: string; name?: string } = {
      exists: false
    }

    if (roleInput) {
      const existingRole = interaction.guild?.roles.cache.find(
        (r) =>
          r.name === roleInput ||
          r.id === roleInput ||
          `<@&${r.id}>` === roleInput
      )

      roleInfo = {
        exists: !!existingRole,
        id: existingRole?.id,
        name: existingRole?.name || roleInput
      }
    }

    // Create and show the modal
    const [modalId, modal] = createScheduleModal()
    await interaction.showModal(modal)

    try {
      logger.info('Waiting for modal submission...')

      // Use awaitModalSubmit to handle the modal response
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
    } catch (error) {
      logger.error('Error with modal submission:', error)
      // No need to reply here as the interaction may have timed out
    }
  } catch (error) {
    logger.error('Error in schedule command:', error)
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
    // Always defer the reply first thing
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

    // Get the server record
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply(
        'Failed to retrieve server record. Please try again later.'
      )
    }

    // Handle the game role if provided
    let gameId: string | undefined
    let gameRoleId: string | undefined

    if (roleInfo) {
      if (roleInfo.exists && roleInfo.id) {
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
      } else if (roleInfo.name) {
        // This is a new role name that needs to be created for a game
        try {
          const newGameRole = await interaction.guild!.roles.create({
            name: roleInfo.name,
            reason: `Game role for ${title}`
          })
          gameRoleId = newGameRole.id

          // Note: We don't have a game ID yet because we need to create the game
          // This would require additional changes to create a game here
          // For now, we'll just use the role for the game day without associating it with a game
        } catch (error) {
          logger.error('Error creating game role:', error)
          return interaction.editReply(
            'Failed to create the game role. Please make sure the bot has the necessary permissions.'
          )
        }
      }
    }

    // Create a new Discord role for this game day
    const gameDayRole = await createGameDayRole(interaction, title, dateTime)
    if (!gameDayRole) {
      // If we created a game role but failed to create the game day role, clean up
      if (gameRoleId && !roleInfo?.exists) {
        try {
          const role = await interaction.guild!.roles.fetch(gameRoleId)
          if (role) {
            await role.delete('Game day role creation failed')
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up game role:', cleanupError)
        }
      }

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

    // Create a success embed
    const embed = new EmbedBuilder()
      .setTitle('Game Day Scheduled!')
      .setDescription(
        `Your game day has been scheduled in draft mode. Use the publish command to make it visible to others.`
      )
      .setColor(Colors.Green)
      .addFields(
        { name: 'Title', value: title, inline: false },
        { name: 'Date & Time', value: dateTime.toLocaleString(), inline: true },
        { name: 'Location', value: location, inline: true },
        { name: 'Status', value: 'SCHEDULING (Draft)', inline: true },
        { name: 'Role', value: `<@&${gameDayRole.id}>`, inline: true }
      )
      .setFooter({ text: `Game Day ID: ${gameDay.id}` })
      .setTimestamp()

    // Send the success message
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    logger.error('Error handling modal submission:', error)

    if (interaction.deferred || interaction.replied) {
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

    console.log('Creating role:', roleName)
    console.log('Interaction guild:', interaction.guild)

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
  const year = dateTime.getFullYear().toString().substring(2) // Last 2 digits of year

  return `${titlePart}-${month}-${day}-${year}`
}
