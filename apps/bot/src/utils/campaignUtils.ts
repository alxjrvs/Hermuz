import { logger } from '~/utils/logger'
import type { Campaign } from '@hermuz/db'
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
  if (campaign.gameName) {
    return `${campaign.title} (${campaign.gameName})`
  }
  return campaign.title
}
