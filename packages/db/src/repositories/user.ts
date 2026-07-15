import { eq } from 'drizzle-orm'
import { db } from '../client'
import { users } from '../schema'
import type { User, NewUser } from '../index'

export const getUser = async (discordId: string): Promise<User | null> => {
  try {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, discordId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching user', err)
    return null
  }
}

export const createUser = async (user: NewUser): Promise<User | null> => {
  try {
    const [row] = await db.insert(users).values(user).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating user', err)
    return null
  }
}

export const updateUser = async (
  discordId: string,
  updates: Partial<NewUser>
): Promise<User | null> => {
  try {
    const [row] = await db
      .update(users)
      .set(updates)
      .where(eq(users.discordId, discordId))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating user', err)
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
  return createUser({ discordId, username })
}
