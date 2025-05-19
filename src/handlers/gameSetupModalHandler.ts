import { logger } from 'robo.js'
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { createGame } from '../models/game'
import { getDiscordServerByDiscordId } from '../models/discordServer'
import { GameSetupModalData } from '../utils/modalUtils'

/**
 * Handle the game setup modal submission
 *
 * @param interaction The modal submission interaction
 * @param modalData The deserialized modal data
 */
export async function handleGameSetupModalSubmit(
  interaction: ModalSubmitInteraction,
  modalData: GameSetupModalData
) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const { roleInfo, guildId } = modalData

    // Extract values from the modal
    const name = interaction.fields.getTextInputValue('name')
    const shortName = interaction.fields.getTextInputValue('short_name')
    const description = interaction.fields.getTextInputValue('description')
    const minPlayersStr = interaction.fields.getTextInputValue('min_players')
    const maxPlayersStr = interaction.fields.getTextInputValue('max_players')

    // Validate numeric inputs
    const minPlayers = parseInt(minPlayersStr, 10)
    const maxPlayers = parseInt(maxPlayersStr, 10)

    if (isNaN(minPlayers) || minPlayers < 1) {
      return interaction.editReply('Minimum players must be a positive number.')
    }

    if (isNaN(maxPlayers) || maxPlayers < minPlayers) {
      return interaction.editReply(
        'Maximum players must be a number greater than or equal to minimum players.'
      )
    }

    // Get the server record
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply(
        'Server not found. Please make sure the bot is properly installed.'
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
        return interaction.editReply({
          content:
            'Failed to create the role. Please make sure the bot has the necessary permissions.'
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
    logger.error('Error handling game setup modal submission:', error)

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
