import { supabase } from '../utils/supabase'
import type {
  Player,
  PlayerInsert,
  PlayerUpdate,
  PlayerStatus
} from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation,
  executeDbModifyOperation
} from '../utils/databaseUtils'
export const getPlayer = async (id: string): Promise<Player | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('players').select('*').eq('id', id).single(),
    'Error fetching player',
    'getPlayer'
  )
}
export const getPlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string
): Promise<Player | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single(),
    'Error fetching player by user and campaign',
    'getPlayerByUserAndCampaign'
  )
}
export const getPlayersByCampaign = async (
  campaignId: string
): Promise<Player[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('players')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at'),
    'Error fetching players by campaign',
    'getPlayersByCampaign'
  )
}
export const getPlayersByUser = async (userId: string): Promise<Player[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .order('created_at'),
    'Error fetching players by user',
    'getPlayersByUser'
  )
}
export const createPlayer = async (
  player: PlayerInsert
): Promise<Player | null> => {
  return executeDbOperation(
    async () => await supabase.from('players').insert(player).select().single(),
    'Error creating player',
    'createPlayer'
  )
}
export const updatePlayer = async (
  id: string,
  updates: PlayerUpdate
): Promise<Player | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
    'Error updating player',
    'updatePlayer'
  )
}
export const updatePlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string,
  updates: PlayerUpdate
): Promise<Player | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('players')
        .update(updates)
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .select()
        .single(),
    'Error updating player by user and campaign',
    'updatePlayerByUserAndCampaign'
  )
}
export const deletePlayer = async (id: string): Promise<boolean> => {
  return executeDbModifyOperation(
    async () => await supabase.from('players').delete().eq('id', id),
    'Error deleting player',
    'deletePlayer'
  )
}
export const deletePlayerByUserAndCampaign = async (
  userId: string,
  campaignId: string
): Promise<boolean> => {
  return executeDbModifyOperation(
    async () =>
      await supabase
        .from('players')
        .delete()
        .eq('user_id', userId)
        .eq('campaign_id', campaignId),
    'Error deleting player by user and campaign',
    'deletePlayerByUserAndCampaign'
  )
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
    user_id: userId,
    campaign_id: campaignId,
    character_name: characterName,
    status
  })
}
export const getPlayersByCampaignAndStatus = async (
  campaignId: string,
  status: PlayerStatus
): Promise<Player[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('players')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', status)
        .order('created_at'),
    'Error fetching players by campaign and status',
    'getPlayersByCampaignAndStatus'
  )
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
