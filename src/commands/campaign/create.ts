import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js'
import { getDiscordServerByDiscordId } from '../../models/discordServer'
import { createCampaignModalId } from '../../utils/modalUtils'
import campaignModal from '../../utils/campaignModal'
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
} as const)
export default async (interaction: ChatInputCommandInteraction) => {
  try {
    const gameInput = interaction.options.getString('game', true)
    const roleInput = interaction.options.getString('role', true)
    const server = await getDiscordServerByDiscordId(interaction.guildId!)
    if (!server) {
      return interaction.reply({
        content:
          'This server is not properly set up. Please reinstall the bot to continue.',
        flags: MessageFlags.Ephemeral
      })
    }
    const modalData = {
      command: 'campaign_create',
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
