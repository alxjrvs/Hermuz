import { supabase } from '../utils/supabase'
import type { User, UserInsert, UserUpdate } from '../utils/supabase'
import {
  executeDbOperation,
  executeDbArrayOperation
} from '../utils/databaseUtils'

export const getUser = async (discordId: string): Promise<User | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .single(),
    'Error fetching user',
    'getUser'
  )
}

export const createUser = async (user: UserInsert): Promise<User | null> => {
  return executeDbOperation(
    async () => await supabase.from('users').insert(user).select().single(),
    'Error creating user',
    'createUser'
  )
}

export const updateUser = async (
  discordId: string,
  updates: UserUpdate
): Promise<User | null> => {
  return executeDbOperation(
    async () =>
      await supabase
        .from('users')
        .update(updates)
        .eq('discord_id', discordId)
        .select()
        .single(),
    'Error updating user',
    'updateUser'
  )
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
