import type { StringSelectMenuInteraction } from 'discord.js'
import { logger } from '~/utils/logger'
import { type ButtonData, deserializeButtonData } from './buttonUtils'

/**
 * String-select-menu dispatch, mirroring the button registry. Select customIds
 * use the same serialized `ButtonData` codec; the picked option values live on
 * `interaction.values`.
 */
export interface SelectHandler {
  canHandle: (data: ButtonData) => boolean
  handle: (
    interaction: StringSelectMenuInteraction,
    data: ButtonData
  ) => Promise<void>
}

const selectHandlers: SelectHandler[] = []

export function registerSelectHandler(handler: SelectHandler): void {
  selectHandlers.push(handler)
  logger.info(`Registered select handler: ${handler.constructor.name}`)
}

export async function dispatchSelectInteraction(
  interaction: StringSelectMenuInteraction
): Promise<boolean> {
  try {
    const data = deserializeButtonData(interaction.customId)
    if (!data) {
      logger.debug(`Could not deserialize select data: ${interaction.customId}`)
      return false
    }
    for (const handler of selectHandlers) {
      if (handler.canHandle(data)) {
        await handler.handle(interaction, data)
        return true
      }
    }
    logger.warn(`No handler found for select: ${JSON.stringify(data)}`)
    return false
  } catch (error) {
    logger.error('Error dispatching select interaction:', error)
    return false
  }
}
