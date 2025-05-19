import { supabase } from '../utils/supabase'
import type { User, UserInsert, UserUpdate } from '../utils/supabase'
import { logger } from 'robo.js'
export const getUser = async (discordId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single()
    if (error) {
      logger.error('Error fetching user:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in getUser:', error)
    return null
  }
}
export const createUser = async (user: UserInsert): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    if (error) {
      logger.error('Error creating user:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in createUser:', error)
    return null
  }
}
export const updateUser = async (
  discordId: string,
  updates: UserUpdate
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordId)
      .select()
      .single()
    if (error) {
      logger.error('Error updating user:', error)
      return null
    }
    return data
  } catch (error) {
    logger.error('Error in updateUser:', error)
    return null
  }
}
export const getOrCreateUser = async (
  discordId: string,
  username: string
): Promise<User | null> => {
  const user = await getUser(discordId)
  if (user) {
    return user
  }
  return createUser({
    discord_id: discordId,
    username
  })
}
