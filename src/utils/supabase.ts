import { createClient } from '@supabase/supabase-js'
import { logger } from 'robo.js'
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums
} from '../lib/supabase/database.types'
export type User = Tables<'users'>
export type Game = Tables<'games'>
export type GameDay = Tables<'game_days'>
export type Attendance = Tables<'attendances'>
export type DiscordServer = Tables<'discord_servers'>
export type Campaign = Tables<'campaigns'>
export type Player = Tables<'players'>
export type AttendanceStatus = Enums<'attendance_status'>
export type GameDayStatus = Enums<'game_day_status'>
export type PlayerStatus = Enums<'player_status'>
export type UserInsert = TablesInsert<'users'>
export type GameInsert = TablesInsert<'games'>
export type GameDayInsert = TablesInsert<'game_days'>
export type AttendanceInsert = TablesInsert<'attendances'>
export type DiscordServerInsert = TablesInsert<'discord_servers'>
export type CampaignInsert = TablesInsert<'campaigns'>
export type PlayerInsert = TablesInsert<'players'>
export type UserUpdate = TablesUpdate<'users'>
export type GameUpdate = TablesUpdate<'games'>
export type GameDayUpdate = TablesUpdate<'game_days'>
export type AttendanceUpdate = TablesUpdate<'attendances'>
export type DiscordServerUpdate = TablesUpdate<'discord_servers'>
export type CampaignUpdate = TablesUpdate<'campaigns'>
export type PlayerUpdate = TablesUpdate<'players'>
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseKey || ''
)
export const initSupabase = async (): Promise<boolean> => {
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase URL or key not found in environment variables')
    return false
  }
  try {
    const { error } = await supabase.from('users').select('*').limit(1)
    if (error) {
      logger.error('Error connecting to Supabase:', error)
      return false
    }
    return true
  } catch (error) {
    logger.error('Error initializing Supabase:', error)
    return false
  }
}
