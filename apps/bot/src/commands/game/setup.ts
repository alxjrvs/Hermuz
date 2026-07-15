import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js'
import gameModal from '~/utils/gameModal'
import { createGameSetupModalId } from '../../utils/modalUtils'
export const config = createCommandConfig({
  description: 'Set up a new game with associated role',
  defaultMemberPermissions: PermissionFlagsBits.Administrator, 
  options: [
    {
      name: 'role',
      description:
        'The Discord role associated with this game (existing role or new role name)',
      type: 'string',
      required: true
    }
  ]
} as const)
export default async (interaction: ChatInputCommandInteraction) => {
  const roleInput = interaction.options.getString('role', true)
  const existingRole = interaction.guild?.roles.cache.find(
    (r) =>
      r.name === roleInput || r.id === roleInput || `<@&${r.id}>` === roleInput
  )
  const roleInfo = {
    exists: !!existingRole,
    id: existingRole?.id,
    name: existingRole?.name || roleInput
  }
  const modalId = createGameSetupModalId(roleInfo, interaction.guildId!)
  const modal = gameModal(undefined, modalId)
  await interaction.showModal(modal)
  logger.info('Game setup modal shown to user')
}
