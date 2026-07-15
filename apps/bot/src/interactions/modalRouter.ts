import { MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { handleCampaignCreateModalSubmit } from '~/handlers/campaignCreateModalHandler'
import { handleGameDayScheduleModalSubmit } from '~/handlers/gameDayScheduleModalHandler'
import { handleGameSetupModalSubmit } from '~/handlers/gameSetupModalHandler'
import { logger } from '~/utils/logger'
import {
  deserializeModalData,
  isCampaignCreateModal,
  isCampaignCreateModalId,
  isGameDayScheduleModal,
  isGameDayScheduleModalId,
  isGameSetupModal,
  isGameSetupModalId
} from '~/utils/modalUtils'

async function handleInteractionError(
  interaction: ModalSubmitInteraction,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  logger.error(`Error in modal submission interaction: ${message}`)
  try {
    const userMessage =
      'An error occurred while processing your submission. Please try again later.'
    if (interaction.deferred) {
      await interaction.editReply({ content: userMessage })
    } else {
      await interaction.reply({
        content: userMessage,
        flags: MessageFlags.Ephemeral
      })
    }
  } catch (replyError) {
    logger.error('Error replying to interaction:', replyError)
  }
}

/** Route a modal submission to the correct handler (replaces the Robo modalSubmissions event). */
export async function routeModalSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  try {
    logger.info(`Modal submitted with ID: ${interaction.customId}`)
    const customId = interaction.customId
    const modalData = deserializeModalData(customId)

    if (isGameSetupModalId(customId)) {
      if (modalData && isGameSetupModal(modalData)) {
        await handleGameSetupModalSubmit(interaction, modalData)
      } else {
        logger.warn(`Failed to deserialize game setup modal data: ${customId}`)
      }
    } else if (isGameDayScheduleModalId(customId)) {
      if (modalData && isGameDayScheduleModal(modalData)) {
        await handleGameDayScheduleModalSubmit(interaction, modalData)
      } else {
        logger.warn(
          `Failed to deserialize game day schedule modal data: ${customId}`
        )
      }
    } else if (isCampaignCreateModalId(customId)) {
      if (modalData && isCampaignCreateModal(modalData)) {
        await handleCampaignCreateModalSubmit(interaction, modalData)
      } else {
        logger.warn(
          `Failed to deserialize campaign create modal data: ${customId}`
        )
      }
    } else if (!modalData) {
      logger.warn(`Failed to deserialize modal data: ${customId}`)
    } else if (isGameSetupModal(modalData)) {
      await handleGameSetupModalSubmit(interaction, modalData)
    } else if (isGameDayScheduleModal(modalData)) {
      await handleGameDayScheduleModalSubmit(interaction, modalData)
    } else if (isCampaignCreateModal(modalData)) {
      await handleCampaignCreateModalSubmit(interaction, modalData)
    } else {
      logger.warn(`Unknown modal type: ${JSON.stringify(modalData)}`)
    }
  } catch (error) {
    await handleInteractionError(interaction, error)
  }
}
