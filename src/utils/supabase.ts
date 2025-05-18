import { createClient } from '@supabase/supabase-js'
import { logger } from 'robo.js'
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate
} from '../lib/supabase/database.types'

// Define types based on the generated database types
export type User = Tables<'users'>
export type Game = Tables<'games'>
export type GameDay = Tables<'game_days'>
export type Attendance = Tables<'attendances'>
export type DiscordServer = Tables<'discord_servers'>

// Define insert types
export type UserInsert = TablesInsert<'users'>
export type GameInsert = TablesInsert<'games'>
export type GameDayInsert = TablesInsert<'game_days'>
export type AttendanceInsert = TablesInsert<'attendances'>
export type DiscordServerInsert = TablesInsert<'discord_servers'>

// Define update types
export type UserUpdate = TablesUpdate<'users'>
export type GameUpdate = TablesUpdate<'games'>
export type GameDayUpdate = TablesUpdate<'game_days'>
export type AttendanceUpdate = TablesUpdate<'attendances'>
export type DiscordServerUpdate = TablesUpdate<'discord_servers'>

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseKey || ''
)

// Initialize function to check connection
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
