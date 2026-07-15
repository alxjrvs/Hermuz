import { eq, and, gte, inArray, asc, desc } from 'drizzle-orm'
import { db } from '../client'
import { gameDays, games } from '../schema'
import type { GameDay, NewGameDay, GameDayStatus } from '../index'

/**
 * `status` is NOT NULL with no DB default, but `createGameDay`/`createGameDayDraft`
 * supply it, so callers may omit it here.
 */
type CreateGameDayInput = Omit<NewGameDay, 'status'> & {
  status?: GameDayStatus
}

export const getGameDay = async (id: string): Promise<GameDay | null> => {
  try {
    const [row] = await db
      .select()
      .from(gameDays)
      .where(eq(gameDays.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching game day', err)
    return null
  }
}

export const getGameDayByRoleId = async (
  roleId: string
): Promise<GameDay | null> => {
  try {
    const [row] = await db
      .select()
      .from(gameDays)
      .where(eq(gameDays.discordRoleId, roleId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching game day by role ID', err)
    return null
  }
}

export const getUpcomingGameDays = async (): Promise<GameDay[]> => {
  const now = new Date().toISOString()
  try {
    return await db
      .select()
      .from(gameDays)
      .where(and(gte(gameDays.dateTime, now), eq(gameDays.status, 'CLOSED')))
      .orderBy(asc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching upcoming game days', err)
    return []
  }
}

export const getUpcomingGameDaysByStatus = async (
  statuses: GameDayStatus[]
): Promise<GameDay[]> => {
  const now = new Date().toISOString()
  try {
    return await db
      .select()
      .from(gameDays)
      .where(
        and(gte(gameDays.dateTime, now), inArray(gameDays.status, statuses))
      )
      .orderBy(asc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching upcoming game days by status', err)
    return []
  }
}

export const getAllGameDays = async (): Promise<GameDay[]> => {
  try {
    return await db.select().from(gameDays).orderBy(desc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching all game days', err)
    return []
  }
}

export const getGameDaysByGame = async (gameId: string): Promise<GameDay[]> => {
  try {
    return await db
      .select()
      .from(gameDays)
      .where(eq(gameDays.gameId, gameId))
      .orderBy(desc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching game days by game', err)
    return []
  }
}

export const getGameDaysByCampaign = async (
  campaignId: string
): Promise<GameDay[]> => {
  try {
    return await db
      .select()
      .from(gameDays)
      .where(eq(gameDays.campaignId, campaignId))
      .orderBy(asc(gameDays.sessionNumber), asc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching game days by campaign', err)
    return []
  }
}

export const getGameDaysByHost = async (
  hostUserId: string
): Promise<GameDay[]> => {
  try {
    return await db
      .select()
      .from(gameDays)
      .where(eq(gameDays.hostUserId, hostUserId))
      .orderBy(desc(gameDays.dateTime))
  } catch (err) {
    console.error('Error fetching game days by host', err)
    return []
  }
}

export const createGameDay = async (
  gameDay: CreateGameDayInput
): Promise<GameDay | null> => {
  // Default status to CLOSED if not provided.
  const status: GameDayStatus = gameDay.status ?? 'CLOSED'
  let discordRoleId = gameDay.discordRoleId

  // Try to backfill discord_role_id from the game if not provided.
  if (gameDay.gameId && !discordRoleId) {
    const game = await getGameRoleId(gameDay.gameId)
    if (game) {
      discordRoleId = game
    }
  }

  try {
    const [row] = await db
      .insert(gameDays)
      .values({ ...gameDay, status, discordRoleId })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating game day', err)
    return null
  }
}

export const createGameDayDraft = async (
  gameDay: Omit<CreateGameDayInput, 'status'>
): Promise<GameDay | null> => {
  return createGameDay({
    ...gameDay,
    status: 'SCHEDULING'
  })
}

export const updateGameDay = async (
  id: string,
  updates: Partial<NewGameDay>
): Promise<GameDay | null> => {
  try {
    const [row] = await db
      .update(gameDays)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(gameDays.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating game day', err)
    return null
  }
}

export const publishGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CLOSED' })
}

export const cancelGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CANCELLED' })
}

/** Internal: fetch just a game's discord_role_id, swallowing errors. */
const getGameRoleId = async (gameId: string): Promise<string | null> => {
  try {
    const [row] = await db
      .select({ discordRoleId: games.discordRoleId })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1)
    return row?.discordRoleId ?? null
  } catch {
    // Silently continue if we can't get the role ID.
    return null
  }
}
