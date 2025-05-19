import { logger } from 'robo.js'
import { PermissionFlagsBits, type Guild } from 'discord.js'

/**
 * Parse a date/time string in YYYY-MM-DD HH:MM format
 *
 * @param dateTimeStr The date/time string to parse
 * @returns A Date object if the string is valid, null otherwise
 */
export function parseDateTime(dateTimeStr: string): Date | null {
  // Regular expression to match YYYY-MM-DD HH:MM format
  const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
  const match = dateTimeStr.match(regex)

  if (!match) {
    return null
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match

  // Parse components as integers
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 // JavaScript months are 0-indexed
  const day = parseInt(dayStr, 10)
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  // Validate ranges
  if (
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  // Create and return the date
  const date = new Date(year, month, day, hour, minute)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Create a Discord role for a game day
 *
 * @param guild The Discord guild where the role will be created
 * @param title The title of the game day
 * @param dateTime The date and time of the game day
 * @returns The created role, or null if creation failed
 */
export async function createGameDayRole(
  guild: Guild,
  title: string,
  dateTime: Date
): Promise<import('discord.js').Role | null> {
  try {
    // Generate a role name based on the title and date
    const roleName = generateRoleName(title, dateTime)

    // Create the role
    const role = await guild.roles.create({
      name: roleName,
      reason: 'Game day event role',
      permissions: PermissionFlagsBits.ViewChannel
    })

    return role
  } catch (error) {
    logger.error('Error creating game day role:', error)
    return null
  }
}

/**
 * Generate a role name based on the title and date
 *
 * @param title The title of the game day
 * @param dateTime The date and time of the game day
 * @returns A generated role name
 */
export function generateRoleName(title: string, dateTime: Date): string {
  // Take the first 10 characters of the title, removing spaces and special characters
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 10)
    .toLowerCase()

  // Format the date as MM-DD-YY
  const month = (dateTime.getMonth() + 1).toString().padStart(2, '0')
  const day = dateTime.getDate().toString().padStart(2, '0')
  const year = dateTime.getFullYear().toString().substring(2)

  // Combine the parts
  return `gameday-${titlePart}-${month}${day}${year}`
}
