import { AttendanceStatus, GameDayStatus, PlayerStatus } from '../types/enums'
export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return ['AVAILABLE', 'INTERESTED', 'NOT_AVAILABLE'].includes(
    value as AttendanceStatus
  )
}
export function isGameDayStatus(value: string): value is GameDayStatus {
  return ['CLOSED', 'SCHEDULING', 'CANCELLED'].includes(value as GameDayStatus)
}
export function isPlayerStatus(value: string): value is PlayerStatus {
  return ['INTERESTED', 'CONFIRMED'].includes(value as PlayerStatus)
}
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false
  try {
    const date = new Date(value)
    return !isNaN(date.getTime()) && value.includes('T')
  } catch {
    return false
  }
}
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard)
}
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}
export function isDiscordId(value: unknown): value is string {
  if (!isString(value)) return false
  return /^\d{17,19}$/.test(value)
}
