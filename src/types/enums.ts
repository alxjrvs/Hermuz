import { GameDay, Attendance, Player } from '~/utils/supabase'

/**
 * Enum for game day status values
 */
export type GameDayStatus = GameDay['status']

/**
 * Enum for attendance status values
 */
export type AttendanceStatus = Attendance['status']

/**
 * Enum for player status values
 */
export type PlayerStatus = Player['status']
