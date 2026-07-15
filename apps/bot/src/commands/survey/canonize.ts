import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { canonizeSurvey } from '~/services/surveyService'
import { respondSurveyAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Pick a survey date and schedule it as a real game day',
  options: [
    {
      name: 'survey',
      description: 'The survey',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'date',
      description: 'The winning date',
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
  if (!interaction.guild) {
    return interaction.editReply('This command must be used in a server.')
  }
  const surveyId = interaction.options.getString('survey', true)
  const dateId = interaction.options.getString('date', true)
  try {
    const result = await canonizeSurvey(
      interaction.client,
      interaction.guild,
      surveyId,
      dateId,
      interaction.user.id,
      interaction.user.username
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply(
      `✅ Scheduled **${result.data.title}** — the available players carried over as attending.`
    )
  } catch (err) {
    logger.error('/survey canonize failed:', err)
    return interaction.editReply('Something went wrong canonizing the survey.')
  }
}
