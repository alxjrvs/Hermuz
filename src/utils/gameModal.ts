import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js'
import { Game } from '~/utils/supabase'

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

  if (defaultValues?.short_name) {
    shortNameInput.setValue(defaultValues.short_name)
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

  if (defaultValues?.min_players) {
    minPlayersInput.setValue(defaultValues.min_players.toString())
  }

  const maxPlayersInput = new TextInputBuilder()
    .setCustomId('max_players')
    .setLabel('Maximum Players')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the maximum number of players')
    .setRequired(true)
    .setValue('4')

  if (defaultValues?.max_players) {
    maxPlayersInput.setValue(defaultValues.max_players.toString())
  }

  // Add inputs to action rows (max 5 inputs per modal, 1 input per action row)
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

  // Add action rows to the modal
  modal.addComponents(
    nameActionRow,
    shortNameActionRow,
    descriptionActionRow,
    minPlayersActionRow,
    maxPlayersActionRow
  )

  // Return the modal ID and the modal builder
  return modal
}
