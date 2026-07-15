import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js'
import { respondToSurvey } from '~/services/surveyService'
import { logger } from '~/utils/logger'
import { type ButtonData, isSurveyVote } from '../utils/buttonUtils'
import type { SelectHandler } from '../utils/selectRegistry'

export const surveySelectHandler: SelectHandler = {
  canHandle: (data: ButtonData) => isSurveyVote(data),
  handle: async (
    interaction: StringSelectMenuInteraction,
    data: ButtonData
  ) => {
    if (!isSurveyVote(data)) return
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const result = await respondToSurvey(
        interaction.client,
        data.surveyId,
        interaction.user.id,
        interaction.user.username,
        interaction.values
      )
      await interaction.editReply(
        !result.ok
          ? result.error
          : interaction.values.length
            ? `Availability saved — ${interaction.values.length} day(s). 📅`
            : 'Cleared — marked as available on no days.'
      )
    } catch (err) {
      logger.error('Error handling survey select:', err)
      if (interaction.deferred) {
        await interaction.editReply('Something went wrong saving that.')
      }
    }
  }
}
