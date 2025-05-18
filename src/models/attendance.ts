import { supabase } from '../utils/supabase'
import type {
  Attendance,
  AttendanceInsert,
  AttendanceUpdate
} from '../utils/supabase'
import { logger } from 'robo.js'

export const getAttendance = async (id: string): Promise<Attendance | null> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      logger.error('Error fetching attendance:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error in getAttendance:', error)
    return null
  }
}

export const getUserAttendance = async (
  gameDayId: string,
  userId: string
): Promise<Attendance | null> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('game_day_id', gameDayId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "No rows returned" error
      logger.error('Error fetching user attendance:', error)
      return null
    }

    return data || null
  } catch (error) {
    logger.error('Error in getUserAttendance:', error)
    return null
  }
}

export const getGameDayAttendances = async (
  gameDayId: string
): Promise<Attendance[]> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('game_day_id', gameDayId)

    if (error) {
      logger.error('Error fetching game day attendances:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error in getGameDayAttendances:', error)
    return []
  }
}

export const getAttendancesByStatus = async (
  gameDayId: string,
  status: Attendance['status']
): Promise<Attendance[]> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('game_day_id', gameDayId)
      .eq('status', status)

    if (error) {
      logger.error(`Error fetching attendances with status ${status}:`, error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error(`Error in getAttendancesByStatus for ${status}:`, error)
    return []
  }
}

export const createAttendance = async (
  attendance: AttendanceInsert
): Promise<Attendance | null> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .insert(attendance)
      .select()
      .single()

    if (error) {
      logger.error('Error creating attendance:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error in createAttendance:', error)
    return null
  }
}

export const updateAttendance = async (
  id: string,
  updates: AttendanceUpdate
): Promise<Attendance | null> => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating attendance:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error in updateAttendance:', error)
    return null
  }
}

export const updateUserAttendance = async (
  gameDayId: string,
  userId: string,
  status: Attendance['status']
): Promise<Attendance | null> => {
  try {
    // Check if attendance record exists
    const existingAttendance = await getUserAttendance(gameDayId, userId)

    if (existingAttendance) {
      // Update existing attendance
      return updateAttendance(existingAttendance.id, { status })
    } else {
      // Create new attendance
      return createAttendance({
        game_day_id: gameDayId,
        user_id: userId,
        status
      })
    }
  } catch (error) {
    logger.error('Error in updateUserAttendance:', error)
    return null
  }
}
