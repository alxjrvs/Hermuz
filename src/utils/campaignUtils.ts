import { logger } from 'robo.js'
import type { Campaign } from '../utils/supabase'

/**
 * Format the regular game time for display
 * 
 * @param regularGameTime The regular game time string
 * @returns A formatted string for display
 */
export function formatRegularGameTime(regularGameTime: string): string {
  try {
    // Return the regular game time as is, as it's already in a human-readable format
    return regularGameTime
  } catch (error) {
    logger.error('Error formatting regular game time:', error)
    return regularGameTime // Return the original string if formatting fails
  }
}

/**
 * Generate a role name for a campaign
 * 
 * @param title The title of the campaign
 * @returns A generated role name
 */
export function generateCampaignRoleName(title: string): string {
  // Take the first 15 characters of the title, removing spaces and special characters
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 15)
    .toLowerCase()

  // Combine the parts
  return `campaign-${titlePart}`
}

/**
 * Get a display name for a campaign
 * 
 * @param campaign The campaign object
 * @returns A display name that includes the game name if available
 */
export function getCampaignDisplayName(campaign: Campaign): string {
  if (campaign.game_name) {
    return `${campaign.title} (${campaign.game_name})`
  }
  return campaign.title
}
