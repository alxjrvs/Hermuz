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
    const timestamp = Date.now().toString(36) 
    if (isGameSetupModal(data)) {
      const exists = data.roleInfo.exists ? '1' : '0'
      const roleId = data.roleInfo.id || ''
      const guildId = data.guildId
      return `gs:${timestamp}:${exists}:${roleId}:${guildId}:${data.roleInfo.name}`
    } else if (isGameDayScheduleModal(data)) {
      const exists = data.roleInfo?.exists ? '1' : '0'
      const roleId = data.roleInfo?.id || ''
      return `gds:${timestamp}:${data.userId}:${data.guildId}:${exists}:${roleId}:${data.username}:${data.roleInfo?.name || ''}`
    } else if (isCampaignCreateModal(data)) {
      const guildId = data.guildId
      const gameInput = encodeURIComponent(data.gameInfo.input)
      const roleInput = encodeURIComponent(data.roleInfo.input)
      return `cc:${timestamp}:${guildId}:${gameInput}:${roleInput}`
    }
    logger.warn('Unknown modal type, using JSON serialization')
    return JSON.stringify(data)
  } catch (error) {
    logger.error('Error serializing modal data:', error)
    throw new Error('Failed to serialize modal data')
  }
}
export function deserializeModalData(customId: string): ModalData | null {
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
    } else {
      return JSON.parse(customId) as ModalData
    }
  } catch (error) {
    logger.error('Error deserializing modal data:', error)
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
  return customId.startsWith('gs:')
}
export function isGameDayScheduleModalId(customId: string): boolean {
  return customId.startsWith('gds:')
}
export function isCampaignCreateModalId(customId: string): boolean {
  return customId.startsWith('cc:')
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
