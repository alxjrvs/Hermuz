import { logger } from 'robo.js'

/**
 * Interface for game setup modal data
 */
export interface GameSetupModalData {
  command: 'game_setup'
  roleInfo: {
    exists: boolean
    id?: string
    name: string
  }
  guildId: string
}

/**
 * Interface for game day schedule modal data
 */
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

/**
 * Interface for campaign create modal data
 */
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

/**
 * Type for all modal data types
 */
export type ModalData =
  | GameSetupModalData
  | GameDayScheduleModalData
  | CampaignCreateModalData

/**
 * Serialize modal data to a customId string
 *
 * @param data The modal data to serialize
 * @returns A string that can be used as a customId
 */
export function serializeModalData(data: ModalData): string {
  try {
    // Create a compact representation of the data
    // Format: <command>:<timestamp>:<data>
    // Where <data> depends on the command type
    const timestamp = Date.now().toString(36) // Base36 encoding for timestamp

    if (isGameSetupModal(data)) {
      // For game setup: gs:<timestamp>:<exists>:<roleId>:<guildId>
      // Where <exists> is 1 or 0, and roleId is optional
      const exists = data.roleInfo.exists ? '1' : '0'
      const roleId = data.roleInfo.id || ''
      const guildId = data.guildId

      return `gs:${timestamp}:${exists}:${roleId}:${guildId}:${data.roleInfo.name}`
    } else if (isGameDayScheduleModal(data)) {
      // For game day schedule: gds:<timestamp>:<userId>:<guildId>:<exists>:<roleId>
      // Where <exists> is 1 or 0, and roleId is optional
      const exists = data.roleInfo?.exists ? '1' : '0'
      const roleId = data.roleInfo?.id || ''

      return `gds:${timestamp}:${data.userId}:${data.guildId}:${exists}:${roleId}:${data.username}:${data.roleInfo?.name || ''}`
    } else if (isCampaignCreateModal(data)) {
      // For campaign create: cc:<timestamp>:<guildId>:<gameInput>:<roleInput>
      const guildId = data.guildId
      const gameInput = encodeURIComponent(data.gameInfo.input)
      const roleInput = encodeURIComponent(data.roleInfo.input)

      return `cc:${timestamp}:${guildId}:${gameInput}:${roleInput}`
    }

    // Fallback to JSON for unknown types (should never happen)
    logger.warn('Unknown modal type, using JSON serialization')
    return JSON.stringify(data)
  } catch (error) {
    logger.error('Error serializing modal data:', error)
    throw new Error('Failed to serialize modal data')
  }
}

/**
 * Deserialize a customId string to modal data
 *
 * @param customId The customId string to deserialize
 * @returns The deserialized modal data or null if deserialization fails
 */
export function deserializeModalData(customId: string): ModalData | null {
  try {
    // Check if this is a compact format or JSON
    if (customId.startsWith('gs:')) {
      // Game setup format: gs:<timestamp>:<exists>:<roleId>:<guildId>:<roleName>
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
      // Game day schedule format: gds:<timestamp>:<userId>:<guildId>:<exists>:<roleId>:<username>:<roleName>
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
      // Campaign create format: cc:<timestamp>:<guildId>:<gameInput>:<roleInput>
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
    } else {
      // Try JSON format for backward compatibility
      return JSON.parse(customId) as ModalData
    }
  } catch (error) {
    logger.error('Error deserializing modal data:', error)
    return null
  }
}

/**
 * Check if the customId is for a game setup modal
 *
 * @param data The modal data to check
 * @returns True if the modal is a game setup modal, false otherwise
 */
export function isGameSetupModal(data: ModalData): data is GameSetupModalData {
  return data.command === 'game_setup'
}

/**
 * Check if the customId is for a game day schedule modal
 *
 * @param data The modal data to check
 * @returns True if the modal is a game day schedule modal, false otherwise
 */
export function isGameDayScheduleModal(
  data: ModalData
): data is GameDayScheduleModalData {
  return data.command === 'game_day_schedule'
}

/**
 * Check if the customId is for a campaign create modal
 *
 * @param data The modal data to check
 * @returns True if the modal is a campaign create modal, false otherwise
 */
export function isCampaignCreateModal(
  data: ModalData
): data is CampaignCreateModalData {
  return data.command === 'campaign_create'
}

/**
 * Check if a string is a game setup modal ID
 *
 * @param customId The custom ID to check
 * @returns True if the custom ID is for a game setup modal, false otherwise
 */
export function isGameSetupModalId(customId: string): boolean {
  return customId.startsWith('gs:')
}

/**
 * Check if a string is a game day schedule modal ID
 *
 * @param customId The custom ID to check
 * @returns True if the custom ID is for a game day schedule modal, false otherwise
 */
export function isGameDayScheduleModalId(customId: string): boolean {
  return customId.startsWith('gds:')
}

/**
 * Check if a string is a campaign create modal ID
 *
 * @param customId The custom ID to check
 * @returns True if the custom ID is for a campaign create modal, false otherwise
 */
export function isCampaignCreateModalId(customId: string): boolean {
  return customId.startsWith('cc:')
}

/**
 * Create a customId for a game setup modal
 *
 * @param roleInfo The role information
 * @param guildId The guild ID
 * @returns A customId string for the modal
 */
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

/**
 * Create a customId for a game day schedule modal
 *
 * @param userId The user ID
 * @param username The username
 * @param guildId The guild ID
 * @param roleInfo Optional role information
 * @returns A customId string for the modal
 */
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

/**
 * Create a customId for a campaign create modal
 *
 * @param modalData The campaign create modal data
 * @returns A customId string for the modal
 */
export function createCampaignModalId(
  modalData: CampaignCreateModalData
): string {
  return serializeModalData(modalData)
}
