import { MessageFlags, type ButtonInteraction } from 'discord.js'
import { logger } from '~/utils/logger'
import { ButtonData, isMealButton } from '../utils/buttonUtils'
import { ButtonHandler } from '../utils/buttonRegistry'
import { respondToMeal } from '~/services/mealService'

export const mealButtonHandler: ButtonHandler = {
  canHandle: (data: ButtonData) => isMealButton(data),
  handle: async (interaction: ButtonInteraction, data: ButtonData) => {
    if (!isMealButton(data)) return
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const result = await respondToMeal(
        interaction.client,
        data.mealId,
        interaction.user.id,
        interaction.user.username,
        data.response === 'IN'
      )
      await interaction.editReply(
        !result.ok
          ? result.error
          : data.response === 'IN'
            ? "You're in for this meal. 🍽️"
            : "Noted — you're out for this meal."
      )
    } catch (err) {
      logger.error('Error handling meal button:', err)
      if (interaction.deferred) {
        await interaction.editReply('Something went wrong recording that.')
      }
    }
  }
}
