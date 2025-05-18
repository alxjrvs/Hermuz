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
  try {
    // Get the role input (could be an existing role or a new role name)
    const roleInput = interaction.options.getString('role', true)

    // Check if the input matches an existing role
    const existingRole = interaction.guild?.roles.cache.find(
      (r) =>
        r.name === roleInput ||
        r.id === roleInput ||
        `<@&${r.id}>` === roleInput
    )

    // Store role information for later use
    const roleInfo = {
      exists: !!existingRole,
      id: existingRole?.id,
      name: existingRole?.name || roleInput
    }

    const [modalId, modal] = gameModal()

    await interaction.showModal(modal)

    try {
      logger.info('Waiting for modal submission...')

      // Use awaitModalSubmit instead of event listeners
      const modalSubmitInteraction = await interaction.awaitModalSubmit({
        // Filter to only accept the modal with our custom ID
        filter: (i) => i.customId === modalId,
        // Time to wait for a submission in milliseconds
        time: 300000 // 5 minutes timeout
      })

      logger.info('Modal submitted, processing...')

      await handleModalSubmit(
        modalSubmitInteraction,
        roleInfo,
        interaction.guildId!
      )
      logger.info('Modal processing complete')
    } catch (error) {
      logger.error('Error with modal submission:', error)
    }
  } catch (error) {
    logger.error('Error in game setup command:', error)
    if (!interaction.replied) {
      await interaction.reply({
        content:
          'An error occurred while setting up the game. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}

async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  roleInfo: { exists: boolean; id?: string; name: string },
  guildId: string
) {
  try {
    // Always defer the reply first thing
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
      return interaction.editReply('Please enter valid numbers for players.')
    }

    if (minPlayers <= 0 || maxPlayers <= 0) {
      return interaction.editReply('Player counts must be positive numbers.')
    }

    if (minPlayers > maxPlayers) {
      return interaction.editReply(
        'Minimum players cannot be greater than maximum players.'
      )
    }

    // Get the server record
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply(
        'Failed to retrieve server record. Please try again later.'
      )
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
        return interaction.editReply(
          'Failed to create the role. Please make sure the bot has the necessary permissions.'
        )
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
