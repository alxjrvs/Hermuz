import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Client, Guild } from 'discord.js'
import { config } from '~/config'
import type { ServiceResult } from '~/services/result'

/** Translate a service result into a JSON response. */
export function sendResult<T>(c: Context, result: ServiceResult<T>): Response {
  if (result.ok) return c.json(result.data as object)
  return c.json(
    { error: result.error },
    (result.status ?? 400) as ContentfulStatusCode
  )
}

/** Resolve the single guild the bot serves. */
export function resolveGuild(client: Client): Promise<Guild> {
  return client.guilds.fetch(config.guildId)
}

/** Parse a JSON body, returning null on malformed input. */
export async function readJson<T>(c: Context): Promise<T | null> {
  try {
    return (await c.req.json()) as T
  } catch {
    return null
  }
}
