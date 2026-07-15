import type { Guild } from 'discord.js'
import { createGame, type Game } from '@hermuz/db'
import { createGameRole } from '~/utils/roleUtils'
import { logger } from '~/utils/logger'
import { ok, fail, type ServiceResult } from './result'

export interface CreateGameInput {
  name: string
  shortName: string
  description?: string | null
  minPlayers?: number | null
  maxPlayers?: number | null
  /** Reuse an existing Discord role instead of creating a new one. */
  discordRoleId?: string | null
}

/**
 * Create a game, reusing the supplied Discord role or creating a fresh one named
 * after the game. Mirrors `gameSetupModalHandler`: if the DB insert fails and we
 * created the role, we clean the role back up.
 */
export async function createGameWithRole(
  guild: Guild,
  input: CreateGameInput
): Promise<ServiceResult<Game>> {
  let roleId = input.discordRoleId ?? undefined
  let createdRoleId: string | undefined

  if (!roleId) {
    const role = await createGameRole(
      guild,
      input.name,
      `Game role for ${input.name}`
    )
    if (!role) {
      return fail('Failed to create the Discord role for the game.', 500)
    }
    roleId = role.id
    createdRoleId = role.id
  }

  const game = await createGame({
    name: input.name,
    shortName: input.shortName,
    description: input.description ?? null,
    discordRoleId: roleId,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null
  })

  if (!game) {
    if (createdRoleId) {
      try {
        const role = await guild.roles.fetch(createdRoleId)
        if (role) await role.delete('Game creation failed')
      } catch (err) {
        logger.error('Error cleaning up role after game creation failed:', err)
      }
    }
    return fail('Failed to create the game.', 500)
  }

  return ok(game)
}
