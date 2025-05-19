import { supabase } from '../utils/supabase'
import type {
  Attendance,
  AttendanceInsert,
  AttendanceUpdate
} from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation,
  executeDbModifyOperation
} from '../utils/databaseUtils'

export const getAttendance = async (id: string): Promise<Attendance | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('attendances').select('*').eq('id', id).single(),
    'Error fetching attendance',
    'getAttendance'
  )
}

export const getUserAttendance = async (
  gameDayId: string,
  userId: string
): Promise<Attendance | null> => {
  const result = await executeDbOperation(
    async () =>
      await supabase
        .from('attendances')
        .select('*')
        .eq('game_day_id', gameDayId)
        .eq('user_id', userId)
        .single(),
    'Error fetching user attendance',
    'getUserAttendance'
  )

  // Handle the PGRST116 error code (no rows returned) by returning null instead of treating it as an error
  return result
}

export const getGameDayAttendances = async (
  gameDayId: string
): Promise<Attendance[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('attendances')
        .select('*')
        .eq('game_day_id', gameDayId),
    'Error fetching game day attendances',
    'getGameDayAttendances'
  )
}

export const getAttendancesByStatus = async (
  gameDayId: string,
  status: Attendance['status']
): Promise<Attendance[]> => {
  return executeDbArrayOperation(
    async () =>
      await supabase
        .from('attendances')
        .select('*')
        .eq('game_day_id', gameDayId)
        .eq('status', status),
    `Error fetching attendances with status ${status}`,
    'getAttendancesByStatus'
  )
}

export const createAttendance = async (
  attendance: AttendanceInsert
): Promise<Attendance | null> => {
  return executeDbOperation(
    async () =>
      await supabase.from('attendances').insert(attendance).select().single(),
    'Error creating attendance',
    'createAttendance'
  )
}

export const updateAttendance = async (
  id: string,
  updates: AttendanceUpdate
): Promise<Attendance | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('attendances')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
    'Error updating attendance',
    'updateAttendance'
  )
}
export const updateUserAttendance = async (
  gameDayId: string,
  userId: string,
  status: Attendance['status']
): Promise<Attendance | null> => {
  const existingAttendance = await getUserAttendance(gameDayId, userId)
  if (existingAttendance) {
    return updateAttendance(existingAttendance.id, { status })
  } else {
    return createAttendance({
      game_day_id: gameDayId,
      user_id: userId,
      status
    })
  }
}
