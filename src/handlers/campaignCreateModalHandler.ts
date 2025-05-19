import { logger } from 'robo.js'
import {
  MessageFlags,
  type ModalSubmitInteraction,
  PermissionFlagsBits
} from 'discord.js'
import { getGameByRoleId } from '../models/game'
import { createCampaign } from '../models/campaign'
import { getDiscordServerByDiscordId } from '../models/discordServer'
import { createCampaignChannels } from '../utils/channelUtils'
import { CampaignCreateModalData } from '../utils/modalUtils'
import { generateCampaignRoleName } from '../utils/campaignUtils'

/**
 * Handle the campaign create modal submission
 *
 * @param interaction The modal submission interaction
 * @param modalData The deserialized modal data
 */
export async function handleCampaignCreateModalSubmit(
  interaction: ModalSubmitInteraction,
  modalData: CampaignCreateModalData
) {
  try {
    // For modal submissions, we need to acknowledge the interaction first
    // Use deferReply to acknowledge the modal submission
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const { guildId, gameInfo, roleInfo } = modalData

    // Get the values from the modal
    const title = interaction.fields.getTextInputValue('title')
    const description = interaction.fields.getTextInputValue('description')
    const regularGameTime =
      interaction.fields.getTextInputValue('regular_game_time')

    // Get the Discord server
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply({
        content:
          'This server is not properly set up. Please reinstall the bot to continue.'
      })
    }

    // Check if the guild exists
    const guild = interaction.guild
    if (!guild) {
      return interaction.editReply({
        content: 'Could not find the Discord server.'
      })
    }

    // Process the game input (either a role ID or a game name)
    let gameId: string | null = null
    let gameName: string | null = null

    // Check if the game input is a role mention or ID
    const rolePattern = /^<@&(\d+)>$|^(\d+)$/
    const roleMatch = gameInfo.input.match(rolePattern)

    if (roleMatch) {
      // It's a role ID or mention, try to find the game
      const roleId = roleMatch[1] || roleMatch[2]
      const game = await getGameByRoleId(roleId)

      if (game) {
        gameId = game.id
      } else {
        // Role exists but no game found, use as game name
        gameName = gameInfo.input
      }
    } else {
      // It's a game name
      gameName = gameInfo.input
    }

    // Process the role input and create a role
    const roleName = generateCampaignRoleName(roleInfo.input)

    // Create the role
    const role = await guild.roles.create({
      name: roleName,
      reason: `Campaign role for ${title}`,
      permissions: [PermissionFlagsBits.ViewChannel]
    })

    // Create the campaign in the database
    const campaign = await createCampaign({
      title,
      description,
      game_id: gameId,
      game_name: gameName,
      regular_game_time: regularGameTime,
      discord_role_id: role.id,
      server_id: server.id
    })

    if (!campaign) {
      // Clean up the role if campaign creation failed
      await role.delete('Campaign creation failed')
      return interaction.editReply({
        content: 'Failed to create the campaign. Please try again later.'
      })
    }

    // Create the campaign channels
    const categoryName = `Campaign: ${title}`
    const channels = await createCampaignChannels(guild, categoryName, role)

    if (!channels) {
      return interaction.editReply({
        content:
          'Campaign created, but failed to create channels. Please check bot permissions.'
      })
    }

    // Success message
    return interaction.editReply({
      content: `Campaign "${title}" has been created successfully! A private category with channels has been created for members with the ${role} role.`
    })
  } catch (error) {
    logger.error('Error in campaign create modal handler:', error)
    return interaction.editReply({
      content:
        'An error occurred while creating the campaign. Please try again later.'
    })
  }
}
