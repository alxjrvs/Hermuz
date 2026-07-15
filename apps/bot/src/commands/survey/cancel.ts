import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { cancelSurvey } from '~/services/surveyService'
import { respondSurveyAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Cancel an open game-day survey',
  options: [
    {
      name: 'survey',
      description: 'The survey to cancel',
      type: 'string',
      required: true,
      autocomplete: true
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondSurveyAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const surveyId = interaction.options.getString('survey', true)
  try {
    const result = await cancelSurvey(interaction.client, surveyId)
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply('🚫 Survey cancelled.')
  } catch (err) {
    logger.error('/survey cancel failed:', err)
    return interaction.editReply('Something went wrong cancelling the survey.')
  }
}
