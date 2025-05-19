import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  type ModalSubmitInteraction,
  MessageFlags
} from 'discord.js'
import { createGame } from '../../models/game'
import { getDiscordServerByDiscordId } from '../../models/discordServer'
import gameModal from '~/utils/gameModal'

export const config = createCommandConfig({
  description: 'Set up a new game with associated role',
  defaultMemberPermissions: PermissionFlagsBits.Administrator, // Requires Administrator permission
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

  const [modalId, modal] = gameModal()

  await interaction.showModal(modal)

  logger.info('Waiting for modal submission...')

  const modalSubmitInteraction = await interaction.awaitModalSubmit({
    filter: (i) => i.customId === modalId,
    time: 300000
  })

  logger.info('Modal submitted, processing...')

  await handleModalSubmit(
    modalSubmitInteraction,
    roleInfo,
    interaction.guildId!
  )
  logger.info('Modal processing complete')
}

async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  roleInfo: { exists: boolean; id?: string; name: string },
  guildId: string
) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const name = interaction.fields.getTextInputValue('name')
    const shortName = interaction.fields.getTextInputValue('short_name')
    const description = interaction.fields.getTextInputValue('description')
    const minPlayersStr = interaction.fields.getTextInputValue('min_players')
    const maxPlayersStr = interaction.fields.getTextInputValue('max_players')

    // Validate numeric inputs
    const minPlayers = parseInt(minPlayersStr, 10)
    const maxPlayers = parseInt(maxPlayersStr, 10)

    if (isNaN(minPlayers) || isNaN(maxPlayers)) {
      return interaction.reply({
        content: 'Please enter valid numbers for players.',
        flags: MessageFlags.Ephemeral
      })
    }

    if (minPlayers <= 0 || maxPlayers <= 0) {
      return interaction.reply({
        content: 'Player counts must be positive numbers.',
        flags: MessageFlags.Ephemeral
      })
    }

    if (minPlayers > maxPlayers) {
      return interaction.reply({
        content: 'Minimum players cannot be greater than maximum players.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Get the server record
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.reply({
        content: 'Failed to retrieve server record. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }

    // Handle role creation if needed
    let roleId: string
    if (roleInfo.exists && roleInfo.id) {
      // Use existing role
      roleId = roleInfo.id
    } else {
      // Create a new role with the provided name
      try {
        const newRole = await interaction.guild!.roles.create({
          name: roleInfo.name,
          reason: `Game role for ${name}`
        })
        roleId = newRole.id
      } catch (error) {
        logger.error('Error creating role:', error)
        return interaction.reply({
          content:
            'Failed to create the role. Please make sure the bot has the necessary permissions.',
          flags: MessageFlags.Ephemeral
        })
      }
    }

    // Create the game
    const game = await createGame({
      name,
      short_name: shortName,
      description,
      discord_role_id: roleId,
      min_players: minPlayers,
      max_players: maxPlayers,
      server_id: server.id
    })

    if (!game) {
      // If game creation failed and we created a new role, try to clean up
      if (!roleInfo.exists) {
        try {
          const role = await interaction.guild!.roles.fetch(roleId)
          if (role) {
            await role.delete('Game creation failed')
          }
        } catch (cleanupError) {
          logger.error(
            'Error cleaning up role after game creation failed:',
            cleanupError
          )
        }
      }

      return interaction.editReply(
        'Failed to create the game. Please try again later.'
      )
    }

    // Success message
    const roleMention = `<@&${roleId}>`
    const roleCreationMessage = roleInfo.exists ? 'with the' : 'and created the'

    await interaction.editReply({
      content: `Game "${name}" (${shortName}) has been successfully set up ${roleCreationMessage} ${roleMention} role!`
    })
  } catch (error) {
    logger.error('Error handling modal submission:', error)

    try {
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
    } catch (replyError) {
      // If we can't reply, just log the error
      logger.error('Error replying to interaction:', replyError)
    }
  }
}
