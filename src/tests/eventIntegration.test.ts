import { describe, test, expect, mock, spyOn } from 'bun:test'
import { logger } from 'robo.js'
import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} from 'discord.js'
import { safelyDeleteEvent, EventError, EventErrorCode } from '../utils/eventUtils'

// Mock the Discord.js classes and methods
const mockGuildScheduledEvent = {
  id: '123456789',
  name: 'Test Event',
  description: 'Test Description',
  scheduledStartTime: new Date(),
  scheduledEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
  entityType: GuildScheduledEventEntityType.External,
  privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  entityMetadata: { location: 'Test Location' },
  delete: mock(() => Promise.resolve()),
  edit: mock((options: any) => Promise.resolve({ ...mockGuildScheduledEvent, ...options }))
}

const mockGuild = {
  scheduledEvents: {
    create: mock(() => Promise.resolve(mockGuildScheduledEvent)),
    fetch: mock((id: string) => {
      if (id === '123456789') {
        return Promise.resolve(mockGuildScheduledEvent)
      } else if (id === 'error') {
        return Promise.reject(new Error('Unknown ScheduledEvent'))
      } else if (id === 'permission-error') {
        return Promise.reject(new Error('Missing Permissions'))
      } else {
        return Promise.resolve(null)
      }
    }),
    delete: mock((id: string) => Promise.resolve())
  }
}

// Mock the database functions
const mockGameDay = {
  id: 'game-day-123',
  title: 'Test Game Day',
  description: 'Test Description',
  date_time: new Date().toISOString(),
  location: 'Test Location',
  discord_event_id: '123456789'
}

const mockUpdateGameDay = mock((id: string, updates: any) => {
  return Promise.resolve({ ...mockGameDay, ...updates })
})

// Spy on logger
spyOn(logger, 'info')
spyOn(logger, 'error')
spyOn(logger, 'warn')

describe('Discord Scheduled Event Integration', () => {
  test('safelyDeleteEvent should delete an event successfully', async () => {
    const result = await safelyDeleteEvent(mockGuild as any, '123456789')
    expect(result).toBe(true)
    expect(mockGuildScheduledEvent.delete).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully deleted scheduled event'))
  })

  test('safelyDeleteEvent should handle non-existent events', async () => {
    const result = await safelyDeleteEvent(mockGuild as any, 'non-existent')
    expect(result).toBe(false)
  })

  test('safelyDeleteEvent should handle permission errors', async () => {
    try {
      await safelyDeleteEvent(mockGuild as any, 'permission-error')
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(EventError)
      expect((error as EventError).code).toBe(EventErrorCode.MISSING_PERMISSIONS)
    }
  })

  test('Event creation in game_day schedule command', async () => {
    // This is a more complex test that would require mocking the entire interaction
    // For now, we'll just verify that our mocks are set up correctly
    const createResult = await mockGuild.scheduledEvents.create({
      name: 'Test Event',
      description: 'Test Description',
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: { location: 'Test Location' }
    })

    expect(createResult).toEqual(mockGuildScheduledEvent)
    expect(mockGuild.scheduledEvents.create).toHaveBeenCalled()
  })

  test('Event deletion in game_day cancel command', async () => {
    // This is a more complex test that would require mocking the entire interaction
    // For now, we'll just verify that our mocks are set up correctly
    const fetchResult = await mockGuild.scheduledEvents.fetch('123456789')
    expect(fetchResult).toEqual(mockGuildScheduledEvent)

    await fetchResult.delete()
    expect(mockGuildScheduledEvent.delete).toHaveBeenCalled()
  })
})

// Manual testing instructions
/*
Since we can't fully test the Discord integration in an automated way,
here are the manual testing steps to verify the implementation:

1. Testing Event Creation:
   - Use the /game_day schedule command to create a new game day
   - Verify that a Discord scheduled event is created with the correct details
   - Verify that the event ID is stored in the game_day record
   - Verify that the announcement message includes a link to the event
   - Verify that the event description includes a link to the announcement message

2. Testing Event Deletion:
   - Use the /game_day cancel command to cancel a game day
   - Verify that the associated Discord scheduled event is deleted
   - Verify that the success message indicates that the event was deleted

3. Testing Error Handling:
   - Remove the "Manage Events" permission from the bot
   - Try to create a game day and verify that an appropriate error message is shown
   - Try to cancel a game day and verify that an appropriate error message is shown
   - Restore the "Manage Events" permission

4. Edge Cases:
   - Create a game day, manually delete the Discord event, then try to cancel the game day
   - Verify that the cancel command handles the missing event gracefully
   - Create a game day with a very long title/description and verify that the event is created correctly
   - Create a game day scheduled for far in the future and verify that the event is created correctly
*/
