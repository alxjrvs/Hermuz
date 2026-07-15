import { logger } from 'robo.js'
import type { Campaign } from '../utils/supabase'
export function formatRegularGameTime(regularGameTime: string): string {
  try {
    return regularGameTime
  } catch (error) {
    logger.error('Error formatting regular game time:', error)
    return regularGameTime 
  }
}
export function generateCampaignRoleName(title: string): string {
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '') 
    .substring(0, 15)
    .toLowerCase()
  return `campaign-${titlePart}`
}
export function getCampaignDisplayName(campaign: Campaign): string {
  if (campaign.game_name) {
    return `${campaign.title} (${campaign.game_name})`
  }
  return campaign.title
}
