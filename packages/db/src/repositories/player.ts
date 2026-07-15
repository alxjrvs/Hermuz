import { and, asc, eq } from 'drizzle-orm'
import { db } from '../client'
import type { NewPlayer, Player, PlayerStatus } from '../index'
import { players } from '../schema'

export const getPlayer = async (id: string): Promise<Player | null> => {
  try {
    const [row] = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching player', err)
    return null
  }
}

export const getPlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string
): Promise<Player | null> => {
  try {
    const [row] = await db
      .select()
      .from(players)
      .where(
        and(eq(players.userId, userId), eq(players.campaignId, campaignId))
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching player by user and campaign', err)
    return null
  }
}

export const getPlayersByCampaign = async (
  campaignId: string
): Promise<Player[]> => {
  try {
    return await db
      .select()
      .from(players)
      .where(eq(players.campaignId, campaignId))
      .orderBy(asc(players.createdAt))
  } catch (err) {
    console.error('Error fetching players by campaign', err)
    return []
  }
}

export const getPlayersByUser = async (userId: string): Promise<Player[]> => {
  try {
    return await db
      .select()
      .from(players)
      .where(eq(players.userId, userId))
      .orderBy(asc(players.createdAt))
  } catch (err) {
    console.error('Error fetching players by user', err)
    return []
  }
}

export const createPlayer = async (
  player: NewPlayer
): Promise<Player | null> => {
  try {
    const [row] = await db.insert(players).values(player).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating player', err)
    return null
  }
}

export const updatePlayer = async (
  id: string,
  updates: Partial<NewPlayer>
): Promise<Player | null> => {
  try {
    const [row] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating player', err)
    return null
  }
}

export const updatePlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string,
  updates: Partial<NewPlayer>
): Promise<Player | null> => {
  try {
    const [row] = await db
      .update(players)
      .set(updates)
      .where(
        and(eq(players.userId, userId), eq(players.campaignId, campaignId))
      )
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating player by user and campaign', err)
    return null
  }
}

export const deletePlayer = async (id: string): Promise<boolean> => {
  try {
    await db.delete(players).where(eq(players.id, id))
    return true
  } catch (err) {
    console.error('Error deleting player', err)
    return false
  }
}

export const deletePlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string
): Promise<boolean> => {
  try {
    await db
      .delete(players)
      .where(
        and(eq(players.userId, userId), eq(players.campaignId, campaignId))
      )
    return true
  } catch (err) {
    console.error('Error deleting player by user and campaign', err)
    return false
  }
}

export const getOrCreatePlayer = async (
  userId: string,
  campaignId: string,
  characterName?: string,
  status: PlayerStatus = 'INTERESTED'
): Promise<Player | null> => {
  const existingPlayer = await getPlayerByUserAndCampaign(userId, campaignId)
  if (existingPlayer) {
    return existingPlayer
  }
  return createPlayer({
    userId,
    campaignId,
    characterName,
    status
  })
}

export const getPlayersByCampaignAndStatus = async (
  campaignId: string,
  status: PlayerStatus
): Promise<Player[]> => {
  try {
    return await db
      .select()
      .from(players)
      .where(
        and(eq(players.campaignId, campaignId), eq(players.status, status))
      )
      .orderBy(asc(players.createdAt))
  } catch (err) {
    console.error('Error fetching players by campaign and status', err)
    return []
  }
}

export const updatePlayerStatus = async (
  id: string,
  status: PlayerStatus
): Promise<Player | null> => {
  return updatePlayer(id, { status })
}

export const updatePlayerStatusByUserAndCampaign = async (
  userId: string,
  campaignId: string,
  status: PlayerStatus
): Promise<Player | null> => {
  return updatePlayerByUserAndCampaign(userId, campaignId, { status })
}
