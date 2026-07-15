import { createCommandConfig, logger } from 'robo.js'
import {
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} from 'discord.js'
import { getDiscordServerByDiscordId } from '../../models/discordServer'
import { createGameDayScheduleModalId } from '../../utils/modalUtils'
export const config = createCommandConfig({
  description: 'Schedule a new game day event',
  options: [
    {
      name: 'role',
      description: 'The Discord role associated with a game',
      type: 'role',
      required: false
    }
  ]
} as const)
export default async (interaction: ChatInputCommandInteraction) => {
  const server = await getDiscordServerByDiscordId(interaction.guildId!)
  if (!server || !server.scheduling_channel_id) {
    return interaction.reply({
      content:
        'This server does not have a scheduling channel set. Please ask an administrator to use the `/set_scheduling_channel` command to set one up before scheduling game days.',
      flags: MessageFlags.Ephemeral
    })
  }
  const role = interaction.options.getRole('role')
  let roleInfo: { exists: boolean; id?: string; name?: string } = {
    exists: false
  }
  if (role) {
    roleInfo = {
      exists: true,
      id: role.id,
      name: role.name
    }
  }
  const modalId = createGameDayScheduleModalId(
    interaction.user.id,
    interaction.user.username,
    interaction.guildId!,
    roleInfo
  )
  const modal = createScheduleModal(modalId)
  await interaction.showModal(modal)
  logger.info('Game day schedule modal shown to user')
}
function createScheduleModal(modalId: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle('Schedule Game Day')
  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter a title for the game day')
    .setRequired(true)
    .setMaxLength(100)
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter details about the event')
    .setRequired(true)
    .setMaxLength(1000)
  const dateTimeInput = new TextInputBuilder()
    .setCustomId('date_time')
    .setLabel('Date/Time (YYYY-MM-DD HH:MM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 2023-12-31 19:30')
    .setRequired(true)
  const locationInput = new TextInputBuilder()
    .setCustomId('location')
    .setLabel('Location')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Where the event will take place')
    .setRequired(true)
    .setMaxLength(100)
  const titleActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    titleInput
  )
  const descriptionActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  const dateTimeActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateTimeInput)
  const locationActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(locationInput)
  modal.addComponents(
    titleActionRow,
    descriptionActionRow,
    dateTimeActionRow,
    locationActionRow
  )
  return modal
}
