import { AttendanceStatus } from '../types/enums'
import { PlayerStatus } from '../types/enums'
import { GameDay, Campaign } from './supabase'

/**
 * Generate a status message for attendance updates
 * @param status The attendance status
 * @param gameDay The game day
 * @returns A status message
 */
export function generateAttendanceStatusMessage(
  status: AttendanceStatus,
  gameDay: GameDay
): string {
  switch (status) {
    case 'AVAILABLE':
      return `You are marked as available for "${gameDay.title}". You have been assigned the game day role.`
    case 'INTERESTED':
      return `You are marked as interested in "${gameDay.title}".`
    case 'NOT_AVAILABLE':
      return `You are marked as not available for "${gameDay.title}".`
    default:
      return `Your attendance status for "${gameDay.title}" has been updated.`
  }
}

/**
 * Generate a status message for campaign interest updates
 * @param status The player status
 * @param campaign The campaign
 * @returns A status message
 */
export function generateCampaignInterestStatusMessage(
  status: PlayerStatus,
  campaign: Campaign
): string {
  switch (status) {
    case 'INTERESTED':
      return `You are now interested in the "${campaign.title}" campaign! You have been assigned the campaign role.`
    case 'CONFIRMED':
      return `You are now confirmed for the "${campaign.title}" campaign! You have been assigned the campaign role.`
    default:
      return `Your interest in the "${campaign.title}" campaign has been updated.`
  }
}

/**
 * Generate an error message for attendance updates
 * @param errorType The type of error
 * @param entityName Optional entity name (e.g., game day title)
 * @returns An error message
 */
export function generateAttendanceErrorMessage(
  errorType: 'not_found' | 'user_error' | 'attendance_error' | 'generic',
  entityName?: string
): string {
  switch (errorType) {
    case 'not_found':
      return entityName
        ? `${entityName} not found. It may have been deleted.`
        : 'Game day not found. It may have been deleted.'
    case 'user_error':
      return 'Failed to retrieve or create user record. Please try again later.'
    case 'attendance_error':
      return 'Failed to update attendance. Please try again later.'
    case 'generic':
    default:
      return 'An error occurred while updating your attendance. Please try again later.'
  }
}

/**
 * Generate an error message for campaign interest updates
 * @param errorType The type of error
 * @param entityName Optional entity name (e.g., campaign title)
 * @returns An error message
 */
export function generateCampaignInterestErrorMessage(
  errorType: 'not_found' | 'user_error' | 'player_error' | 'generic',
  entityName?: string
): string {
  switch (errorType) {
    case 'not_found':
      return entityName
        ? `${entityName} not found. It may have been deleted.`
        : 'Campaign not found. It may have been deleted.'
    case 'user_error':
      return 'Failed to retrieve or create user record. Please try again later.'
    case 'player_error':
      return 'Failed to update player status. Please try again later.'
    case 'generic':
    default:
      return 'An error occurred while updating your interest. Please try again later.'
  }
}
