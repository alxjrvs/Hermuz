import { logger } from 'robo.js'
export interface GameSetupModalData {
  command: 'game_setup'
  roleInfo: {
    exists: boolean
    id?: string
    name: string
  }
  guildId: string
}
export interface GameDayScheduleModalData {
  command: 'game_day_schedule'
  userId: string
  username: string
  guildId: string
  roleInfo?: {
    exists: boolean
    id?: string
    name?: string
  }
}
export interface CampaignCreateModalData {
  command: 'campaign_create'
  gameInfo: {
    input: string
  }
  roleInfo: {
    input: string
  }
  guildId: string
}
export type ModalData =
  | GameSetupModalData
  | GameDayScheduleModalData
  | CampaignCreateModalData
export function serializeModalData(data: ModalData): string {
  try {
    // Add a timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36)
    const dataWithTimestamp = { ...data, timestamp }

    // Use JSON for all serialization
    return JSON.stringify(dataWithTimestamp)
  } catch (error) {
    logger.error('Error serializing modal data:', error)
    throw new Error('Failed to serialize modal data')
  }
}
export function deserializeModalData(customId: string): ModalData | null {
  try {
    // Handle legacy format IDs for backward compatibility
    if (
      customId.startsWith('gs:') ||
      customId.startsWith('gds:') ||
      customId.startsWith('cc:')
    ) {
      return deserializeLegacyModalData(customId)
    }

    // Use JSON for all deserialization
    const data = JSON.parse(customId) as ModalData & { timestamp?: string }

    // Remove the timestamp property if it exists
    if (data.timestamp) {
      const { timestamp, ...modalData } = data
      return modalData as ModalData
    }

    return data
  } catch (error) {
    logger.error('Error deserializing modal data:', error)
    return null
  }
}

// Function to handle legacy modal data formats for backward compatibility
function deserializeLegacyModalData(customId: string): ModalData | null {
  try {
    if (customId.startsWith('gs:')) {
      const parts = customId.split(':')
      if (parts.length < 6) {
        logger.error('Invalid game setup modal ID format')
        return null
      }
      const exists = parts[2] === '1'
      const roleId = parts[3] || undefined
      const guildId = parts[4]
      const roleName = parts[5]
      return {
        command: 'game_setup',
        roleInfo: {
          exists,
          id: roleId,
          name: roleName
        },
        guildId
      }
    } else if (customId.startsWith('gds:')) {
      const parts = customId.split(':')
      if (parts.length < 8) {
        logger.error('Invalid game day schedule modal ID format')
        return null
      }
      const userId = parts[2]
      const guildId = parts[3]
      const exists = parts[4] === '1'
      const roleId = parts[5] || undefined
      const username = parts[6]
      const roleName = parts[7] || undefined
      return {
        command: 'game_day_schedule',
        userId,
        username,
        guildId,
        roleInfo: exists
          ? {
              exists,
              id: roleId,
              name: roleName
            }
          : undefined
      }
    } else if (customId.startsWith('cc:')) {
      const parts = customId.split(':')
      if (parts.length < 5) {
        logger.error('Invalid campaign create modal ID format')
        return null
      }
      const guildId = parts[2]
      const gameInput = decodeURIComponent(parts[3])
      const roleInput = decodeURIComponent(parts[4])
      return {
        command: 'campaign_create',
        guildId,
        gameInfo: {
          input: gameInput
        },
        roleInfo: {
          input: roleInput
        }
      }
    }

    return null
  } catch (error) {
    logger.error('Error deserializing legacy modal data:', error)
    return null
  }
}
export function isGameSetupModal(data: ModalData): data is GameSetupModalData {
  return data.command === 'game_setup'
}
export function isGameDayScheduleModal(
  data: ModalData
): data is GameDayScheduleModalData {
  return data.command === 'game_day_schedule'
}
export function isCampaignCreateModal(
  data: ModalData
): data is CampaignCreateModalData {
  return data.command === 'campaign_create'
}
export function isGameSetupModalId(customId: string): boolean {
  // Handle legacy format
  if (customId.startsWith('gs:')) {
    return true
  }

  // Handle JSON format
  try {
    const data = JSON.parse(customId) as ModalData
    return isGameSetupModal(data)
  } catch {
    return false
  }
}

export function isGameDayScheduleModalId(customId: string): boolean {
  // Handle legacy format
  if (customId.startsWith('gds:')) {
    return true
  }

  // Handle JSON format
  try {
    const data = JSON.parse(customId) as ModalData
    return isGameDayScheduleModal(data)
  } catch {
    return false
  }
}

export function isCampaignCreateModalId(customId: string): boolean {
  // Handle legacy format
  if (customId.startsWith('cc:')) {
    return true
  }

  // Handle JSON format
  try {
    const data = JSON.parse(customId) as ModalData
    return isCampaignCreateModal(data)
  } catch {
    return false
  }
}
export function createGameSetupModalId(
  roleInfo: {
    exists: boolean
    id?: string
    name: string
  },
  guildId: string
): string {
  return serializeModalData({
    command: 'game_setup',
    roleInfo,
    guildId
  })
}
export function createGameDayScheduleModalId(
  userId: string,
  username: string,
  guildId: string,
  roleInfo?: {
    exists: boolean
    id?: string
    name?: string
  }
): string {
  return serializeModalData({
    command: 'game_day_schedule',
    userId,
    username,
    guildId,
    roleInfo
  })
}
export function createCampaignModalId(
  modalData: CampaignCreateModalData
): string {
  return serializeModalData(modalData)
}
