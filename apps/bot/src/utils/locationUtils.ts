import type { LocationType } from '@hermuz/db'

/** Emoji + label for a location type, defaulting to In Person. */
export function locationTypeLabel(type: LocationType | null | undefined): string {
  return type === 'VIRTUAL' ? '💻 Virtual' : '📍 In Person'
}

/** Field name for the free-text location, which is a join link when virtual. */
export function locationFieldName(
  type: LocationType | null | undefined
): string {
  return type === 'VIRTUAL' ? 'Join Link' : 'Location'
}
