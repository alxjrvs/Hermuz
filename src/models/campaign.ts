import { supabase } from '../utils/supabase'
import type {
  Campaign,
  CampaignInsert,
  CampaignUpdate
} from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation,
  executeDbModifyOperation
} from '../utils/databaseUtils'
export const getCampaign = async (id: string): Promise<Campaign | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('campaigns').select('*').eq('id', id).single(),
    'Error fetching campaign',
    'getCampaign'
  )
}
export const getCampaignByRoleId = async (
  discordRoleId: string
): Promise<Campaign | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('campaigns')
        .select('*')
        .eq('discord_role_id', discordRoleId)
        .single(),
    'Error fetching campaign by role ID',
    'getCampaignByRoleId'
  )
}
export const getAllCampaigns = async (
  serverId?: string
): Promise<Campaign[]> => {
  return executeDbArrayOperation(
    async () => {
      let query = supabase.from('campaigns').select('*').order('title')
      if (serverId) {
        query = query.eq('server_id', serverId)
      }
      return await query
    },
    'Error fetching all campaigns',
    'getAllCampaigns'
  )
}
export const getCampaignsByGame = async (
  gameId: string
): Promise<Campaign[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('campaigns')
        .select('*')
        .eq('game_id', gameId)
        .order('title'),
    'Error fetching campaigns by game',
    'getCampaignsByGame'
  )
}
export const createCampaign = async (
  campaign: CampaignInsert
): Promise<Campaign | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('campaigns').insert(campaign).select().single(),
    'Error creating campaign',
    'createCampaign'
  )
}
export const updateCampaign = async (
  id: string,
  updates: CampaignUpdate
): Promise<Campaign | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
    'Error updating campaign',
    'updateCampaign'
  )
}
export const deleteCampaign = async (id: string): Promise<boolean> => {
  return executeDbModifyOperation(
    async () => await supabase.from('campaigns').delete().eq('id', id),
    'Error deleting campaign',
    'deleteCampaign'
  )
}
