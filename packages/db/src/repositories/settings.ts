import { eq } from 'drizzle-orm'
import { db } from '../client'
import { SETTING_KEYS, settings } from '../schema'

/** Read a raw setting value, or null if unset. */
export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)
    return row?.value ?? null
  } catch (err) {
    console.error('Error fetching setting', err)
    return null
  }
}

/** Upsert a setting value. Returns true on success. */
export const setSetting = async (
  key: string,
  value: string
): Promise<boolean> => {
  try {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
    return true
  } catch (err) {
    console.error('Error setting setting', err)
    return false
  }
}

export const getSchedulingChannelId = (): Promise<string | null> =>
  getSetting(SETTING_KEYS.schedulingChannelId)

export const setSchedulingChannelId = (channelId: string): Promise<boolean> =>
  setSetting(SETTING_KEYS.schedulingChannelId, channelId)
