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

/** Guild timezone (IANA). Defaults to UTC when unset. */
export const getTimezone = async (): Promise<string> =>
  (await getSetting(SETTING_KEYS.timezone)) ?? 'UTC'

export const setTimezone = (tz: string): Promise<boolean> =>
  setSetting(SETTING_KEYS.timezone, tz)

/** Lead time (days) before a session auto-opens. Defaults to 7. */
export const getSessionOpenLeadDays = async (): Promise<number> => {
  const raw = await getSetting(SETTING_KEYS.sessionOpenLeadDays)
  const n = raw == null ? NaN : parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 7
}

export const setSessionOpenLeadDays = (days: number): Promise<boolean> =>
  setSetting(SETTING_KEYS.sessionOpenLeadDays, String(days))
