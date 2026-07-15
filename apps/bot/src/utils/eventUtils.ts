import { logger } from 'robo.js'
import { type Guild, type GuildScheduledEvent } from 'discord.js'
export enum EventErrorCode {
  MISSING_PERMISSIONS = 'MISSING_PERMISSIONS',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  INVALID_ENTITY_TYPE = 'INVALID_ENTITY_TYPE',
  INVALID_ENTITY_METADATA = 'INVALID_ENTITY_METADATA',
  INVALID_SCHEDULED_TIME = 'INVALID_SCHEDULED_TIME',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
export class EventError extends Error {
  code: EventErrorCode
  originalError?: Error
  constructor(
    code: EventErrorCode,
    message: string,
    originalError?: Error | unknown
  ) {
    super(message)
    this.name = 'EventError'
    this.code = code
    if (originalError instanceof Error) {
      this.originalError = originalError
    }
  }
}
export async function safelyFetchEvent(
  guild: Guild,
  eventId: string
): Promise<GuildScheduledEvent | null> {
  try {
    return await guild.scheduledEvents.fetch(eventId)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing Permissions')) {
        throw new EventError(
          EventErrorCode.MISSING_PERMISSIONS,
          'Missing permissions to fetch scheduled event',
          error
        )
      } else if (error.message.includes('Unknown ScheduledEvent')) {
        logger.warn(`Event not found: ${eventId}`)
        return null
      }
    }
    logger.error(`Error fetching scheduled event ${eventId}:`, error)
    throw new EventError(
      EventErrorCode.UNKNOWN_ERROR,
      'Failed to fetch scheduled event',
      error
    )
  }
}
export async function safelyDeleteEvent(
  guild: Guild,
  eventId: string
): Promise<boolean> {
  try {
    const event = await safelyFetchEvent(guild, eventId)
    if (!event) {
      return false
    }
    await event.delete()
    logger.info(`Successfully deleted scheduled event: ${eventId}`)
    return true
  } catch (error) {
    if (error instanceof EventError) {
      throw error
    }
    logger.error(`Error deleting scheduled event ${eventId}:`, error)
    throw new EventError(
      EventErrorCode.UNKNOWN_ERROR,
      'Failed to delete scheduled event',
      error
    )
  }
}
export function getUserFriendlyEventErrorMessage(error: EventError): string {
  switch (error.code) {
    case EventErrorCode.MISSING_PERMISSIONS:
      return 'The bot does not have permission to manage scheduled events. Please ensure the bot has the "Manage Events" permission.'
    case EventErrorCode.EVENT_NOT_FOUND:
      return 'The scheduled event could not be found. It may have been deleted already.'
    case EventErrorCode.INVALID_ENTITY_TYPE:
      return 'Invalid event type specified.'
    case EventErrorCode.INVALID_ENTITY_METADATA:
      return 'Invalid event metadata provided.'
    case EventErrorCode.INVALID_SCHEDULED_TIME:
      return 'Invalid scheduled time provided. Events must be scheduled in the future.'
    case EventErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unknown error occurred while managing the scheduled event. Please check the logs for more details.'
  }
}
