import { supabase } from '../utils/supabase'
import type { GameDay, GameDayInsert, GameDayUpdate } from '../utils/supabase'
import { logger } from 'robo.js'
export const getGameDay = async (id: string): Promise<GameDay | null> => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      logger.error('Error fetching game day:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in getGameDay:', error)
    return null
  }
}
export const getGameDayByRoleId = async (
  roleId: string
): Promise<GameDay | null> => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .eq('discord_role_id', roleId)
      .single()
    if (error) {
      logger.error('Error fetching game day by role ID:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in getGameDayByRoleId:', error)
    return null
  }
}
export const getUpcomingGameDays = async (): Promise<GameDay[]> => {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .gte('date_time', now)
      .eq('status', 'CLOSED')
      .order('date_time')
    if (error) {
      logger.error('Error fetching upcoming game days:', error)
      return []
    }
    return data || []
  } catch (error) {
    logger.error('Error in getUpcomingGameDays:', error)
    return []
  }
}
export const getUpcomingGameDaysByStatus = async (
  statuses: Array<'CLOSED' | 'SCHEDULING' | 'CANCELLED'>
): Promise<GameDay[]> => {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .gte('date_time', now)
      .in('status', statuses)
      .order('date_time')
    if (error) {
      logger.error('Error fetching upcoming game days by status:', error)
      return []
    }
    return data || []
  } catch (error) {
    logger.error('Error in getUpcomingGameDaysByStatus:', error)
    return []
  }
}
export const getGameDaysByGame = async (gameId: string): Promise<GameDay[]> => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .eq('game_id', gameId)
      .order('date_time', { ascending: false })
    if (error) {
      logger.error('Error fetching game days by game:', error)
      return []
    }
    return data || []
  } catch (error) {
    logger.error('Error in getGameDaysByGame:', error)
    return []
  }
}
export const getGameDaysByHost = async (
  hostUserId: string
): Promise<GameDay[]> => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .select('*')
      .eq('host_user_id', hostUserId)
      .order('date_time', { ascending: false })
    if (error) {
      logger.error('Error fetching game days by host:', error)
      return []
    }
    return data || []
  } catch (error) {
    logger.error('Error in getGameDaysByHost:', error)
    return []
  }
}
export const createGameDay = async (
  gameDay: GameDayInsert
): Promise<GameDay | null> => {
  try {
    if (!gameDay.status) {
      gameDay.status = 'CLOSED' 
    }
    if (gameDay.game_id && !gameDay.discord_role_id) {
      try {
        const { data: gameData } = await supabase
          .from('games')
          .select('discord_role_id')
          .eq('id', gameDay.game_id)
          .single()
        if (gameData && gameData.discord_role_id) {
          gameDay.discord_role_id = gameData.discord_role_id
        }
      } catch (err) {
        logger.warn('Could not fetch discord_role_id from game:', err)
      }
    }
    const { data, error } = await supabase
      .from('game_days')
      .insert(gameDay)
      .select()
      .single()
    if (error) {
      logger.error('Error creating game day:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in createGameDay:', error)
    return null
  }
}
export const createGameDayDraft = async (
  gameDay: Omit<GameDayInsert, 'status'>
): Promise<GameDay | null> => {
  return createGameDay({
    ...gameDay,
    status: 'SCHEDULING'
  })
}
export const updateGameDay = async (
  id: string,
  updates: GameDayUpdate
): Promise<GameDay | null> => {
  try {
    const { data, error } = await supabase
      .from('game_days')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      logger.error('Error updating game day:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in updateGameDay:', error)
    return null
  }
}
export const publishGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CLOSED' })
}
export const cancelGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CANCELLED' })
}
