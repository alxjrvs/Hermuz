import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'
import campaignModal from '../../utils/campaignModal'
import { createCampaignModalId } from '../../utils/modalUtils'
export const config = createCommandConfig({
  description: 'Create a new campaign with associated role and channels',
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: 'game',
      description:
        'The game for this campaign (existing game role or new game name)',
      type: 'string',
      required: true
    },
    {
      name: 'role',
      description: 'Name for the campaign role (will be formatted)',
      type: 'string',
      required: true
    }
  ]
})
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    const gameInput = interaction.options.getString('game', true)
    const roleInput = interaction.options.getString('role', true)
    const modalData = {
      command: 'campaign_create' as const,
      gameInfo: {
        input: gameInput
      },
      roleInfo: {
        input: roleInput
      },
      guildId: interaction.guildId!
    }
    const modalId = createCampaignModalId(modalData)
    await interaction.showModal(campaignModal(modalId))
  } catch (error) {
    logger.error('Error in campaign create command:', error)
    await interaction.reply({
      content: 'An error occurred while processing your command.',
      flags: MessageFlags.Ephemeral
    })
  }
}
