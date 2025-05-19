import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js'
import { Campaign } from '~/utils/supabase'
export default function campaignModal(
  customId: string,
  defaultValues?: Campaign
): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Create Campaign')
  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Campaign Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the title of the campaign')
    .setRequired(true)
    .setMaxLength(100)
  if (defaultValues?.title) {
    titleInput.setValue(defaultValues.title)
  }
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Campaign Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter a description of the campaign')
    .setRequired(true)
    .setMaxLength(1000)
  if (defaultValues?.description) {
    descriptionInput.setValue(defaultValues.description)
  }
  const regularGameTimeInput = new TextInputBuilder()
    .setCustomId('regular_game_time')
    .setLabel('Regular Game Time')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Fridays 8PM-11PM EST')
    .setRequired(true)
    .setMaxLength(100)
  if (defaultValues?.regular_game_time) {
    regularGameTimeInput.setValue(defaultValues.regular_game_time)
  }
  const titleActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    titleInput
  )
  const descriptionActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  const regularGameTimeActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(regularGameTimeInput)
  modal.addComponents(
    titleActionRow,
    descriptionActionRow,
    regularGameTimeActionRow
  )
  return modal
}
