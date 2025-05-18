import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { getGameDay } from '../models/gameDay'
import { getOrCreateUser } from '../models/user'
import { updateUserAttendance } from '../models/attendance'
import { AttendanceStatus } from '../types/enums'

export const config = createCommandConfig({
  description: 'Set your attendance status for a game day',
  options: [
    {
      name: 'game_day_id',
      description: 'The ID of the game day',
      type: 'string',
      required: true
    },
    {
      name: 'status',
      description: 'Your attendance status',
      type: 'string',
      required: true,
      choices: [
        {
          name: 'Available',
          value: 'AVAILABLE'
        },
        {
          name: 'Interested',
          value: 'INTERESTED'
        },
        {
          name: 'Not Available',
          value: 'NOT_AVAILABLE'
        }
      ]
    }
  ]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply({ ephemeral: true })

    const gameDayId = interaction.options.getString('game_day_id', true)
    const status = interaction.options.getString('status', true) as AttendanceStatus

    // Get the game day
    const gameDay = await getGameDay(gameDayId)
    if (!gameDay) {
      return interaction.editReply({
        content: 'Game day not found. Please check the ID and try again.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Get or create the user
    const user = await getOrCreateUser(
      interaction.user.id,
      interaction.user.username
    )
    if (!user) {
      return interaction.editReply({
        content: 'Failed to retrieve or create user record. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Update the user's attendance
    const attendance = await updateUserAttendance(
      gameDayId,
      interaction.user.id,
      status
    )

    if (!attendance) {
      return interaction.editReply({
        content: 'Failed to update attendance. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Success message
    let statusMessage = ''
    switch (status) {
      case 'AVAILABLE':
        statusMessage = 'You are marked as available for this game day.'
        break
      case 'INTERESTED':
        statusMessage = 'You are marked as interested in this game day.'
        break
      case 'NOT_AVAILABLE':
        statusMessage = 'You are marked as not available for this game day.'
        break
    }

    return interaction.editReply({
      content: `Attendance updated successfully! ${statusMessage}`,
      flags: MessageFlags.Ephemeral
    })
  } catch (error) {
    logger.error('Error in attend command:', error)
    return interaction.editReply({
      content: 'An error occurred while updating your attendance. Please try again later.',
      flags: MessageFlags.Ephemeral
    })
  }
}
