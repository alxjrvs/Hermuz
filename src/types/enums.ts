import { GameDay, Attendance } from '~/utils/supabase'

/**
 * Enum for game day status values
 */
export type GameDayStatus = GameDay['status']

/**
 * Enum for attendance status values
 */
export type AttendanceStatus = Attendance['status']
