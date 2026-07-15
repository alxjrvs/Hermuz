import { logger } from 'robo.js'
import { 
  Guild, 
  GuildMember, 
  PermissionFlagsBits, 
  type Role 
} from 'discord.js'
import { GameDay, Campaign } from './supabase'
import { AttendanceStatus } from '../types/enums'

/**
 * Assign or remove a role from a member based on attendance status
 * @param member The guild member
 * @param gameDay The game day
 * @param status The attendance status
 * @returns Whether the role was assigned or removed successfully
 */
export async function handleGameDayRoleAssignment(
  member: GuildMember,
  gameDay: GameDay,
  status: AttendanceStatus
): Promise<boolean> {
  if (!gameDay.discord_role_id) {
    return false
  }

  try {
    if (status === 'AVAILABLE') {
      await member.roles.add(
        gameDay.discord_role_id,
        'User marked as available for game day'
      )
      logger.info(
        `Added role ${gameDay.discord_role_id} to user ${member.id} for game day ${gameDay.id}`
      )
      return true
    }
    
    await member.roles.remove(
      gameDay.discord_role_id,
      'User no longer available for game day'
    )
    
    logger.info(
      `Removed role ${gameDay.discord_role_id} from user ${member.id} for game day ${gameDay.id}`
    )
    return true
  } catch (error) {
    logger.error(`Error managing role for user ${member.id}:`, error)
    return false
  }
}

/**
 * Assign a campaign role to a member
 * @param member The guild member
 * @param campaign The campaign
 * @returns Whether the role was assigned successfully
 */
export async function handleCampaignRoleAssignment(
  member: GuildMember,
  campaign: Campaign
): Promise<boolean> {
  if (!campaign.discord_role_id) {
    return false
  }

  try {
    await member.roles.add(
      campaign.discord_role_id,
      'User interested in campaign'
    )
    logger.info(
      `Added role ${campaign.discord_role_id} to user ${member.id} for campaign ${campaign.id}`
    )
    return true
  } catch (error) {
    logger.error(`Error managing role for user ${member.id}:`, error)
    return false
  }
}

/**
 * Create a new role for a game
 * @param guild The guild
 * @param name The role name
 * @param reason The reason for creating the role
 * @returns The created role or null if creation failed
 */
export async function createGameRole(
  guild: Guild,
  name: string,
  reason: string
): Promise<Role | null> {
  try {
    const role = await guild.roles.create({
      name,
      reason
    })
    logger.info(`Created role ${role.id} (${name}) for game`)
    return role
  } catch (error) {
    logger.error('Error creating game role:', error)
    return null
  }
}

/**
 * Create a new role for a campaign
 * @param guild The guild
 * @param name The role name
 * @param reason The reason for creating the role
 * @returns The created role or null if creation failed
 */
export async function createCampaignRole(
  guild: Guild,
  name: string,
  reason: string
): Promise<Role | null> {
  try {
    const role = await guild.roles.create({
      name,
      reason,
      permissions: [PermissionFlagsBits.ViewChannel]
    })
    logger.info(`Created role ${role.id} (${name}) for campaign`)
    return role
  } catch (error) {
    logger.error('Error creating campaign role:', error)
    return null
  }
}

/**
 * Create a new role for a game day
 * @param guild The guild
 * @param name The role name
 * @param reason The reason for creating the role
 * @returns The created role or null if creation failed
 */
export async function createGameDayRole(
  guild: Guild,
  name: string,
  reason: string
): Promise<Role | null> {
  try {
    const role = await guild.roles.create({
      name,
      reason,
      permissions: [PermissionFlagsBits.ViewChannel]
    })
    logger.info(`Created role ${role.id} (${name}) for game day`)
    return role
  } catch (error) {
    logger.error('Error creating game day role:', error)
    return null
  }
}
