import { logger } from 'robo.js'

/**
 * Interface for attendance button data
 */
export interface AttendanceButtonData {
  command: 'attendance'
  status: 'AVAILABLE' | 'INTERESTED' | 'NOT_AVAILABLE'
  gameDayId: string
}

/**
 * Interface for campaign interest button data
 */
export interface CampaignInterestButtonData {
  command: 'campaign_interest'
  campaignId: string
}

/**
 * Type for all button data types
 */
export type ButtonData = AttendanceButtonData | CampaignInterestButtonData

/**
 * Serialize button data to a customId string
 *
 * @param data The button data to serialize
 * @returns A string that can be used as a customId
 */
export function serializeButtonData(data: ButtonData): string {
  try {
    return JSON.stringify(data)
  } catch (error) {
    logger.error('Error serializing button data:', error)
    throw new Error('Failed to serialize button data')
  }
}

/**
 * Deserialize a customId string to button data
 *
 * @param customId The customId string to deserialize
 * @returns The deserialized button data or null if deserialization fails
 */
export function deserializeButtonData(customId: string): ButtonData | null {
  try {
    return JSON.parse(customId) as ButtonData
  } catch (error) {
    logger.error('Error deserializing button data:', error)
    return null
  }
}

/**
 * Check if the customId is for an attendance button
 *
 * @param data The button data to check
 * @returns True if the button is an attendance button, false otherwise
 */
export function isAttendanceButton(
  data: ButtonData
): data is AttendanceButtonData {
  return data.command === 'attendance'
}

/**
 * Check if the customId is for a campaign interest button
 *
 * @param data The button data to check
 * @returns True if the button is a campaign interest button, false otherwise
 */
export function isCampaignInterestButton(
  data: ButtonData
): data is CampaignInterestButtonData {
  return data.command === 'campaign_interest'
}

/**
 * Create a customId for an attendance button
 *
 * @param status The attendance status
 * @param gameDayId The game day ID
 * @returns A customId string for the button
 */
export function createAttendanceButtonId(
  status: 'AVAILABLE' | 'INTERESTED' | 'NOT_AVAILABLE',
  gameDayId: string
): string {
  return serializeButtonData({
    command: 'attendance',
    status,
    gameDayId
  })
}

/**
 * Create a customId for a campaign interest button
 *
 * @param campaignId The campaign ID
 * @returns A customId string for the button
 */
export function createCampaignInterestButtonId(campaignId: string): string {
  return serializeButtonData({
    command: 'campaign_interest',
    campaignId
  })
}
