import type { Game } from '@hermuz/db'
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
export default function gameModal(
  defaultValues?: Game,
  customId?: string
): ModalBuilder {
  const modalId = customId || `game_setup_modal_${Date.now()}`
  const modal = new ModalBuilder().setCustomId(modalId).setTitle('Game Setup')
  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Game Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the name of the game')
    .setRequired(true)
    .setMaxLength(100)
  if (defaultValues?.name) {
    nameInput.setValue(defaultValues.name)
  }
  const shortNameInput = new TextInputBuilder()
    .setCustomId('short_name')
    .setLabel('Short Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter a short identifier for the game')
    .setRequired(true)
    .setMaxLength(50)
  if (defaultValues?.shortName) {
    shortNameInput.setValue(defaultValues.shortName)
  }
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Game Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter a description of the game')
    .setRequired(true)
    .setMaxLength(1000)
  if (defaultValues?.description) {
    descriptionInput.setValue(defaultValues.description)
  }
  const minPlayersInput = new TextInputBuilder()
    .setCustomId('min_players')
    .setLabel('Minimum Players')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the minimum number of players')
    .setRequired(true)
    .setValue('2')
  if (defaultValues?.minPlayers) {
    minPlayersInput.setValue(defaultValues.minPlayers.toString())
  }
  const maxPlayersInput = new TextInputBuilder()
    .setCustomId('max_players')
    .setLabel('Maximum Players')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the maximum number of players')
    .setRequired(true)
    .setValue('4')
  if (defaultValues?.maxPlayers) {
    maxPlayersInput.setValue(defaultValues.maxPlayers.toString())
  }
  const nameActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    nameInput
  )
  const shortNameActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(shortNameInput)
  const descriptionActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  const minPlayersActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(minPlayersInput)
  const maxPlayersActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(maxPlayersInput)
  modal.addComponents(
    nameActionRow,
    shortNameActionRow,
    descriptionActionRow,
    minPlayersActionRow,
    maxPlayersActionRow
  )
  return modal
}
