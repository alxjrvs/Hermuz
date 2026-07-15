import { supabase } from '../utils/supabase'
import type {
  GameDay,
  GameDayInsert,
  GameDayUpdate,
  Game
} from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation
} from '../utils/databaseUtils'

export const getGameDay = async (id: string): Promise<GameDay | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('game_days').select('*').eq('id', id).single(),
    'Error fetching game day',
    'getGameDay'
  )
}

export const getGameDayByRoleId = async (
  roleId: string
): Promise<GameDay | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('game_days')
        .select('*')
        .eq('discord_role_id', roleId)
        .single(),
    'Error fetching game day by role ID',
    'getGameDayByRoleId'
  )
}

export const getUpcomingGameDays = async (): Promise<GameDay[]> => {
  const now = new Date().toISOString()
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('game_days')
        .select('*')
        .gte('date_time', now)
        .eq('status', 'CLOSED')
        .order('date_time'),
    'Error fetching upcoming game days',
    'getUpcomingGameDays'
  )
}

export const getUpcomingGameDaysByStatus = async (
  statuses: Array<'CLOSED' | 'SCHEDULING' | 'CANCELLED'>
): Promise<GameDay[]> => {
  const now = new Date().toISOString()
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('game_days')
        .select('*')
        .gte('date_time', now)
        .in('status', statuses)
        .order('date_time'),
    'Error fetching upcoming game days by status',
    'getUpcomingGameDaysByStatus'
  )
}

export const getGameDaysByGame = async (gameId: string): Promise<GameDay[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('game_days')
        .select('*')
        .eq('game_id', gameId)
        .order('date_time', { ascending: false }),
    'Error fetching game days by game',
    'getGameDaysByGame'
  )
}

export const getGameDaysByHost = async (
  hostUserId: string
): Promise<GameDay[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('game_days')
        .select('*')
        .eq('host_user_id', hostUserId)
        .order('date_time', { ascending: false }),
    'Error fetching game days by host',
    'getGameDaysByHost'
  )
}
export const createGameDay = async (
  gameDay: GameDayInsert
): Promise<GameDay | null> => {
  // Set default status if not provided
  if (!gameDay.status) {
    gameDay.status = 'CLOSED'
  }

  // Try to get discord_role_id from game if not provided
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
      // Silently continue if we can't get the role ID
    }
  }

  return executeDbOperation(
    async () =>
      await supabase.from('game_days').insert(gameDay).select().single(),
    'Error creating game day',
    'createGameDay'
  )
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
  return executeDbOperation(
    async () =>
      await supabase
        .from('game_days')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single(),
    'Error updating game day',
    'updateGameDay'
  )
}

export const publishGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CLOSED' })
}

export const cancelGameDay = async (id: string): Promise<GameDay | null> => {
  return updateGameDay(id, { status: 'CANCELLED' })
}
