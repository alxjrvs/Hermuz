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
      description: 'The Discord role associated with this game',
      type: 'role',
      required: true
    }
  ]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    const role = interaction.options.getRole('role', true)

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
        role.id,
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
  roleId: string,
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
      return interaction.editReply(
        'Failed to create the game. Please try again later.'
      )
    }

    // Success message
    await interaction.editReply({
      content: `Game "${name}" (${shortName}) has been successfully set up with the <@&${roleId}> role!`
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
