import { AttendanceStatus, GameDayStatus, PlayerStatus } from '../types/enums'

/**
 * Type guard for checking if a value is a valid AttendanceStatus
 *
 * @param value The value to check
 * @returns True if the value is a valid AttendanceStatus, false otherwise
 */
export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return ['AVAILABLE', 'INTERESTED', 'NOT_AVAILABLE'].includes(
    value as AttendanceStatus
  )
}

/**
 * Type guard for checking if a value is a valid GameDayStatus
 *
 * @param value The value to check
 * @returns True if the value is a valid GameDayStatus, false otherwise
 */
export function isGameDayStatus(value: string): value is GameDayStatus {
  return ['CLOSED', 'SCHEDULING', 'CANCELLED'].includes(value as GameDayStatus)
}

/**
 * Type guard for checking if a value is a valid PlayerStatus
 *
 * @param value The value to check
 * @returns True if the value is a valid PlayerStatus, false otherwise
 */
export function isPlayerStatus(value: string): value is PlayerStatus {
  return ['INTERESTED', 'CONFIRMED'].includes(value as PlayerStatus)
}

/**
 * Type guard for checking if a value is a non-null object
 *
 * @param value The value to check
 * @returns True if the value is a non-null object, false otherwise
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Type guard for checking if a value is a string
 *
 * @param value The value to check
 * @returns True if the value is a string, false otherwise
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard for checking if a value is a number
 *
 * @param value The value to check
 * @returns True if the value is a number, false otherwise
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard for checking if a value is a boolean
 *
 * @param value The value to check
 * @returns True if the value is a boolean, false otherwise
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard for checking if a value is a Date
 *
 * @param value The value to check
 * @returns True if the value is a Date, false otherwise
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

/**
 * Type guard for checking if a value is a valid ISO date string
 *
 * @param value The value to check
 * @returns True if the value is a valid ISO date string, false otherwise
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false

  try {
    const date = new Date(value)
    return !isNaN(date.getTime()) && value.includes('T')
  } catch {
    return false
  }
}

/**
 * Type guard for checking if a value is an array
 *
 * @param value The value to check
 * @returns True if the value is an array, false otherwise
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for checking if a value is an array of a specific type
 *
 * @param value The value to check
 * @param guard The type guard function to apply to each element
 * @returns True if the value is an array of the specified type, false otherwise
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard)
}

/**
 * Type guard for checking if a value is a non-empty string
 *
 * @param value The value to check
 * @returns True if the value is a non-empty string, false otherwise
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

/**
 * Type guard for checking if a value is a UUID
 *
 * @param value The value to check
 * @returns True if the value is a UUID, false otherwise
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Type guard for checking if a value is a Discord ID (Snowflake)
 *
 * @param value The value to check
 * @returns True if the value is a Discord ID, false otherwise
 */
export function isDiscordId(value: unknown): value is string {
  if (!isString(value)) return false

  // Discord IDs are numeric strings between 17 and 19 characters long
  return /^\d{17,19}$/.test(value)
}
