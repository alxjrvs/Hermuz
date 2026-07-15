import { logger } from 'robo.js'
import { PermissionFlagsBits, type Guild } from 'discord.js'
export function parseDateTime(dateTimeStr: string): Date | null {
  const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
  const match = dateTimeStr.match(regex)
  if (!match) {
    return null
  }
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 
  const day = parseInt(dayStr, 10)
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
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
  const date = new Date(year, month, day, hour, minute)
  return isNaN(date.getTime()) ? null : date
}
export async function createGameDayRole(
  guild: Guild,
  title: string,
  dateTime: Date
): Promise<import('discord.js').Role | null> {
  try {
    const roleName = generateRoleName(title, dateTime)
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
export function generateRoleName(title: string, dateTime: Date): string {
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '') 
    .substring(0, 10)
    .toLowerCase()
  const month = (dateTime.getMonth() + 1).toString().padStart(2, '0')
  const day = dateTime.getDate().toString().padStart(2, '0')
  const year = dateTime.getFullYear().toString().substring(2)
  return `gameday-${titlePart}-${month}${day}${year}`
}
