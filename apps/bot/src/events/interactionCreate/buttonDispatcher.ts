import { logger } from 'robo.js'
import { type ButtonInteraction } from 'discord.js'
import { dispatchButtonInteraction } from '../../utils/buttonRegistry'
import { registerButtonHandler } from '../../utils/buttonRegistry'
import { attendanceButtonHandler } from '../../handlers/attendanceButtonHandler'
import { campaignInterestButtonHandler } from '../../handlers/campaignInterestButtonHandler'

// Register all button handlers
registerButtonHandler(attendanceButtonHandler)
registerButtonHandler(campaignInterestButtonHandler)

export default async (interaction: ButtonInteraction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  try {
    // Dispatch the button interaction to the appropriate handler
    const handled = await dispatchButtonInteraction(interaction)
    
    if (!handled) {
      logger.warn(`Unhandled button interaction: ${interaction.customId}`)
    }
  } catch (error) {
    logger.error('Error in button dispatcher:', error)
  }
}
