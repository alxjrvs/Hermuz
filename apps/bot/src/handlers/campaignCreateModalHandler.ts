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
export async function handleCampaignCreateModalSubmit(
  interaction: ModalSubmitInteraction,
  modalData: CampaignCreateModalData
) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { guildId, gameInfo, roleInfo } = modalData
    const title = interaction.fields.getTextInputValue('title')
    const description = interaction.fields.getTextInputValue('description')
    const regularGameTime =
      interaction.fields.getTextInputValue('regular_game_time')
    const server = await getDiscordServerByDiscordId(guildId)
    if (!server) {
      return interaction.editReply({
        content:
          'This server is not properly set up. Please reinstall the bot to continue.'
      })
    }
    const guild = interaction.guild
    if (!guild) {
      return interaction.editReply({
        content: 'Could not find the Discord server.'
      })
    }
    let gameId: string | null = null
    let gameName: string | null = null
    const rolePattern = /^<@&(\d+)>$|^(\d+)$/
    const roleMatch = gameInfo.input.match(rolePattern)
    if (roleMatch) {
      const roleId = roleMatch[1] || roleMatch[2]
      const game = await getGameByRoleId(roleId)
      if (game) {
        gameId = game.id
      } else {
        gameName = gameInfo.input
      }
    } else {
      gameName = gameInfo.input
    }
    const roleName = generateCampaignRoleName(roleInfo.input)
    const role = await guild.roles.create({
      name: roleName,
      reason: `Campaign role for ${title}`,
      permissions: [PermissionFlagsBits.ViewChannel]
    })
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
      await role.delete('Campaign creation failed')
      return interaction.editReply({
        content: 'Failed to create the campaign. Please try again later.'
      })
    }
    const categoryName = `Campaign: ${title}`
    const channels = await createCampaignChannels(guild, categoryName, role)
    if (!channels) {
      return interaction.editReply({
        content:
          'Campaign created, but failed to create channels. Please check bot permissions.'
      })
    }
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
