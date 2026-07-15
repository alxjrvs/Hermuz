import { asc, eq } from 'drizzle-orm'
import { db } from '../client'
import type { Campaign, NewCampaign } from '../index'
import { campaigns } from '../schema'

export const getCampaign = async (id: string): Promise<Campaign | null> => {
  try {
    const [row] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching campaign', err)
    return null
  }
}

export const getCampaignByRoleId = async (
  discordRoleId: string
): Promise<Campaign | null> => {
  try {
    const [row] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.discordRoleId, discordRoleId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching campaign by role ID', err)
    return null
  }
}

export const getAllCampaigns = async (): Promise<Campaign[]> => {
  try {
    return await db.select().from(campaigns).orderBy(asc(campaigns.title))
  } catch (err) {
    console.error('Error fetching all campaigns', err)
    return []
  }
}

export const getCampaignsByGame = async (
  gameId: string
): Promise<Campaign[]> => {
  try {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.gameId, gameId))
      .orderBy(asc(campaigns.title))
  } catch (err) {
    console.error('Error fetching campaigns by game', err)
    return []
  }
}

export const createCampaign = async (
  campaign: NewCampaign
): Promise<Campaign | null> => {
  try {
    const [row] = await db.insert(campaigns).values(campaign).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating campaign', err)
    return null
  }
}

export const updateCampaign = async (
  id: string,
  updates: Partial<NewCampaign>
): Promise<Campaign | null> => {
  try {
    const [row] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating campaign', err)
    return null
  }
}

export const deleteCampaign = async (id: string): Promise<boolean> => {
  try {
    await db.delete(campaigns).where(eq(campaigns.id, id))
    return true
  } catch (err) {
    console.error('Error deleting campaign', err)
    return false
  }
}
