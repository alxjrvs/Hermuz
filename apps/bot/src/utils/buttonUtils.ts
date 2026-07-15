import { logger } from 'robo.js'
export interface AttendanceButtonData {
  command: 'attendance'
  status: 'AVAILABLE' | 'INTERESTED' | 'NOT_AVAILABLE'
  gameDayId: string
}
export interface CampaignInterestButtonData {
  command: 'campaign_interest'
  campaignId: string
}
export type ButtonData = AttendanceButtonData | CampaignInterestButtonData
export function serializeButtonData(data: ButtonData): string {
  try {
    return JSON.stringify(data)
  } catch (error) {
    logger.error('Error serializing button data:', error)
    throw new Error('Failed to serialize button data')
  }
}
export function deserializeButtonData(customId: string): ButtonData | null {
  try {
    return JSON.parse(customId) as ButtonData
  } catch (error) {
    logger.error('Error deserializing button data:', error)
    return null
  }
}
export function isAttendanceButton(
  data: ButtonData
): data is AttendanceButtonData {
  return data.command === 'attendance'
}
export function isCampaignInterestButton(
  data: ButtonData
): data is CampaignInterestButtonData {
  return data.command === 'campaign_interest'
}
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
export function createCampaignInterestButtonId(campaignId: string): string {
  return serializeButtonData({
    command: 'campaign_interest',
    campaignId
  })
}
