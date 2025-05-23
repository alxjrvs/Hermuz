import { logger } from 'robo.js'
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import {
  deserializeModalData,
  isGameSetupModal,
  isGameDayScheduleModal,
  isCampaignCreateModal,
  isGameSetupModalId,
  isGameDayScheduleModalId,
  isCampaignCreateModalId
} from '../../utils/modalUtils'
import { handleGameSetupModalSubmit } from '../../handlers/gameSetupModalHandler'
import { handleGameDayScheduleModalSubmit } from '../../handlers/gameDayScheduleModalHandler'
import { handleCampaignCreateModalSubmit } from '../../handlers/campaignCreateModalHandler'
async function handleInteractionError(
  interaction: ModalSubmitInteraction,
  error: unknown
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Error in modal submission interaction: ${errorMessage}`)
  try {
    const userMessage =
      'An error occurred while processing your submission. Please try again later.'
    if (interaction.deferred) {
      await interaction.editReply({
        content: userMessage
      })
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
export default async (interaction: ModalSubmitInteraction) => {
  if (!interaction.isModalSubmit()) return
  try {
    logger.info(`Modal submitted with ID: ${interaction.customId}`)
    const customId = interaction.customId
    let modalData = null
    if (isGameSetupModalId(customId)) {
      modalData = deserializeModalData(customId)
      if (modalData && isGameSetupModal(modalData)) {
        await handleGameSetupModalSubmit(interaction, modalData)
      } else {
        logger.warn(
          `Failed to deserialize game setup modal data for ID: ${customId}`
        )
      }
    } else if (isGameDayScheduleModalId(customId)) {
      modalData = deserializeModalData(customId)
      if (modalData && isGameDayScheduleModal(modalData)) {
        await handleGameDayScheduleModalSubmit(interaction, modalData)
      } else {
        logger.warn(
          `Failed to deserialize game day schedule modal data for ID: ${customId}`
        )
      }
    } else if (isCampaignCreateModalId(customId)) {
      modalData = deserializeModalData(customId)
      if (modalData && isCampaignCreateModal(modalData)) {
        await handleCampaignCreateModalSubmit(interaction, modalData)
      } else {
        logger.warn(
          `Failed to deserialize campaign create modal data for ID: ${customId}`
        )
      }
    } else {
      modalData = deserializeModalData(customId)
      if (!modalData) {
        logger.warn(`Failed to deserialize modal data for ID: ${customId}`)
        return
      }
      if (isGameSetupModal(modalData)) {
        await handleGameSetupModalSubmit(interaction, modalData)
      } else if (isGameDayScheduleModal(modalData)) {
        await handleGameDayScheduleModalSubmit(interaction, modalData)
      } else if (isCampaignCreateModal(modalData)) {
        await handleCampaignCreateModalSubmit(interaction, modalData)
      } else {
        logger.warn(`Unknown modal type: ${JSON.stringify(modalData)}`)
      }
    }
  } catch (error) {
    logger.error('Error handling modal submission interaction:', error)
    handleInteractionError(interaction, error)
  }
}
