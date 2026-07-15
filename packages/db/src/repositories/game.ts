import { eq, asc } from 'drizzle-orm'
import { db } from '../client'
import { games } from '../schema'
import type { Game, NewGame } from '../index'

export const getGame = async (id: string): Promise<Game | null> => {
  try {
    const [row] = await db.select().from(games).where(eq(games.id, id)).limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching game', err)
    return null
  }
}

export const getGameByRoleId = async (
  discordRoleId: string
): Promise<Game | null> => {
  try {
    const [row] = await db
      .select()
      .from(games)
      .where(eq(games.discordRoleId, discordRoleId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching game by role ID', err)
    return null
  }
}

export const getAllGames = async (): Promise<Game[]> => {
  try {
    return await db.select().from(games).orderBy(asc(games.name))
  } catch (err) {
    console.error('Error fetching all games', err)
    return []
  }
}

export const createGame = async (game: NewGame): Promise<Game | null> => {
  try {
    const [row] = await db.insert(games).values(game).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating game', err)
    return null
  }
}

export const updateGame = async (
  id: string,
  updates: Partial<NewGame>
): Promise<Game | null> => {
  try {
    const [row] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating game', err)
    return null
  }
}

export const deleteGame = async (id: string): Promise<boolean> => {
  try {
    await db.delete(games).where(eq(games.id, id))
    return true
  } catch (err) {
    console.error('Error deleting game', err)
    return false
  }
}
