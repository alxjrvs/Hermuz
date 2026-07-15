import { getGameDayByRoleId } from '@hermuz/db'
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { closeGameDayWithDiscord } from '~/services/gameDayService'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Close a game day to further RSVPs (keeps its channels & event)',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with the game day to close',
      type: 'role',
      required: true
    }
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator
})

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  try {
    const role = interaction.options.getRole('role', true)
    const gameDay = await getGameDayByRoleId(role.id)
    if (!gameDay) {
      return interaction.editReply({
        content: `The role <@&${role.id}> is not associated with any game day. Please provide a valid game day role.`
      })
    }
    if (gameDay.status === 'CLOSED') {
      return interaction.editReply({
        content: `The game day "${gameDay.title}" is already closed.`
      })
    }

    const result = await closeGameDayWithDiscord(interaction.client, gameDay.id)
    if (!result.ok) {
      return interaction.editReply({ content: result.error })
    }

    return interaction.editReply({
      content: `Game day "${gameDay.title}" has been closed and is no longer taking RSVPs. Its channels and Discord event are still up.`
    })
  } catch (error) {
    logger.error('Error in game_day close command:', error)
    return interaction.editReply({
      content:
        'An error occurred while closing the game day. Please try again later.'
    })
  }
}
