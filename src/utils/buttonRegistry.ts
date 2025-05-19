import { logger } from 'robo.js'
import type { ButtonInteraction } from 'discord.js'
import { ButtonData, deserializeButtonData } from './buttonUtils'

export interface ButtonHandler {
  canHandle: (data: ButtonData) => boolean
  handle: (interaction: ButtonInteraction, data: ButtonData) => Promise<void>
}

const buttonHandlers: ButtonHandler[] = []

/**
 * Register a button handler
 * @param handler The button handler to register
 */
export function registerButtonHandler(handler: ButtonHandler): void {
  buttonHandlers.push(handler)
  logger.info(`Registered button handler: ${handler.constructor.name}`)
}

/**
 * Dispatch a button interaction to the appropriate handler
 * @param interaction The button interaction to dispatch
 * @returns Whether the interaction was handled
 */
export async function dispatchButtonInteraction(
  interaction: ButtonInteraction
): Promise<boolean> {
  try {
    // Try to deserialize the button data
    const buttonData = deserializeButtonData(interaction.customId)
    
    // If we couldn't deserialize the data, it might be a legacy button
    if (!buttonData) {
      logger.debug(`Could not deserialize button data: ${interaction.customId}`)
      return false
    }
    
    // Find a handler that can handle this button
    for (const handler of buttonHandlers) {
      if (handler.canHandle(buttonData)) {
        await handler.handle(interaction, buttonData)
        return true
      }
    }
    
    logger.warn(`No handler found for button: ${JSON.stringify(buttonData)}`)
    return false
  } catch (error) {
    logger.error('Error dispatching button interaction:', error)
    return false
  }
}
