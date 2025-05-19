import { supabase } from '../utils/supabase'
import type { Game, GameInsert, GameUpdate } from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation,
  executeDbModifyOperation
} from '../utils/databaseUtils'
export const getGame = async (id: string): Promise<Game | null> => {
  return executeDbOperation(
    async () => await supabase.from('games').select('*').eq('id', id).single(),
    'Error fetching game',
    'getGame'
  )
}
export const getGameByRoleId = async (
  discordRoleId: string
): Promise<Game | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('games')
        .select('*')
        .eq('discord_role_id', discordRoleId)
        .single(),
    'Error fetching game by role ID',
    'getGameByRoleId'
  )
}
export const getAllGames = async (serverId?: string): Promise<Game[]> => {
  return executeDbArrayOperation(
    async () => {
      let query = supabase.from('games').select('*').order('name')
      if (serverId) {
        query = query.eq('server_id', serverId)
      }
      return await query
    },
    'Error fetching all games',
    'getAllGames'
  )
}
export const createGame = async (game: GameInsert): Promise<Game | null> => {
  return executeDbOperation(
    async () => await supabase.from('games').insert(game).select().single(),
    'Error creating game',
    'createGame'
  )
}
export const updateGame = async (
  id: string,
  updates: GameUpdate
): Promise<Game | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('games')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
    'Error updating game',
    'updateGame'
  )
}
export const deleteGame = async (id: string): Promise<boolean> => {
  return executeDbModifyOperation(
    async () => await supabase.from('games').delete().eq('id', id),
    'Error deleting game',
    'deleteGame'
  )
}
